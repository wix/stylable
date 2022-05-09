import { createFeature, FeatureContext, FeatureTransformContext } from './feature';
import * as STSymbol from './st-symbol';
import type { ImportSymbol } from './st-import';
import type { ElementSymbol } from './css-type';
import type { ClassSymbol } from './css-class';
import { createSubsetAst } from '../helpers/rule';
import {
    diagnostics as MixinHelperDiagnostics,
    parseStMixin,
    parseStPartialMixin,
} from '../helpers/mixin';
import { resolveArgumentsValue } from '../functions';
import { cssObjectToAst } from '../parser';
import * as postcss from 'postcss';
import type { FunctionNode, WordNode } from 'postcss-value-parser';
import { fixRelativeUrls } from '../stylable-assets';
import { isValidDeclaration, mergeRules, INVALID_MERGE_OF } from '../stylable-utils';
import type { StylableMeta } from '../stylable-meta';
import type { CSSResolve } from '../stylable-resolver';
import type { StylableTransformer } from '../stylable-transformer';
import { dirname } from 'path';

export interface MixinValue {
    type: string;
    options: Array<{ value: string }> | Record<string, string>;
    partial?: boolean;
    valueNode?: FunctionNode | WordNode;
    originDecl: postcss.Declaration;
}

export interface RefedMixin {
    mixin: MixinValue;
    ref: ImportSymbol | ClassSymbol | ElementSymbol;
}

export const MixinType = {
    ALL: `-st-mixin` as const,
    PARTIAL: `-st-partial-mixin` as const,
};

export const diagnostics = {
    VALUE_CANNOT_BE_STRING: MixinHelperDiagnostics.VALUE_CANNOT_BE_STRING,
    INVALID_NAMED_PARAMS: MixinHelperDiagnostics.INVALID_NAMED_PARAMS,
    INVALID_MERGE_OF: INVALID_MERGE_OF,
    PARTIAL_MIXIN_MISSING_ARGUMENTS(type: string) {
        return `"${MixinType.PARTIAL}" can only be used with override arguments provided, missing overrides on "${type}"`;
    },
    UNKNOWN_MIXIN(name: string) {
        return `unknown mixin: "${name}"`;
    },
    OVERRIDE_MIXIN(mixinType: string) {
        return `override ${mixinType} on same rule`;
    },
    FAILED_TO_APPLY_MIXIN(error: string) {
        return `could not apply mixin: ${error}`;
    },
    JS_MIXIN_NOT_A_FUNC() {
        return `js mixin must be a function`;
    },
    CIRCULAR_MIXIN(circularPaths: string[]) {
        return `circular mixin found: ${circularPaths.join(' --> ')}`;
    },
    UNKNOWN_MIXIN_SYMBOL(name: string) {
        return `cannot mixin unknown symbol "${name}"`;
    },
};

// HOOKS

export const hooks = createFeature({
    transformLastPass({ context, ast, transformer, cssVarsMapping, path }) {
        ast.walkRules((rule) => appendMixins(context, transformer, rule, cssVarsMapping, path));
    },
});

// API

export function appendMixins(
    context: FeatureTransformContext,
    transformer: StylableTransformer,
    rule: postcss.Rule,
    cssPropertyMapping: Record<string, string>,
    path: string[] = []
) {
    const [decls, mixins] = collectRuleMixins(context, rule);
    if (!mixins || mixins.length === 0) {
        return;
    }
    for (const mixin of mixins) {
        appendMixin(context, { transformer, mixDef: mixin, rule, path, cssPropertyMapping });
    }
    for (const mixinDecl of decls) {
        mixinDecl.remove();
    }
}

function collectRuleMixins(
    context: FeatureTransformContext,
    rule: postcss.Rule
): [decls: postcss.Declaration[], mixins: RefedMixin[]] {
    let mixins: RefedMixin[] = [];
    const { mainNamespace } = context.getResolvedSymbols(context.meta);
    const decls: postcss.Declaration[] = [];
    rule.walkDecls((decl) => {
        if (decl.prop === `-st-mixin` || decl.prop === `-st-partial-mixin`) {
            decls.push(decl);
            mixins = collectDeclMixins(
                context,
                decl,
                (mixinSymbolName) => {
                    return mainNamespace[mixinSymbolName] === 'js' ? 'args' : 'named';
                },
                mixins
            );
        }
    });
    return [decls, mixins];
}

function collectDeclMixins(
    context: FeatureContext,
    decl: postcss.Declaration,
    paramSignature: (mixinSymbolName: string) => 'named' | 'args',
    previousMixins?: RefedMixin[]
): RefedMixin[] {
    const { meta } = context;
    let mixins: RefedMixin[] = [];
    const parser =
        decl.prop === MixinType.ALL
            ? parseStMixin
            : decl.prop === MixinType.PARTIAL
            ? parseStPartialMixin
            : null;
    if (!parser) {
        return previousMixins || mixins;
    }

    parser(decl, paramSignature, context.diagnostics, /*emitStrategyDiagnostics*/ true).forEach(
        (mixin) => {
            const mixinRefSymbol = STSymbol.get(meta, mixin.type);
            if (
                mixinRefSymbol &&
                (mixinRefSymbol._kind === 'import' ||
                    mixinRefSymbol._kind === 'class' ||
                    mixinRefSymbol._kind === 'element')
            ) {
                if (mixin.partial && Object.keys(mixin.options).length === 0) {
                    context.diagnostics.warn(
                        decl,
                        diagnostics.PARTIAL_MIXIN_MISSING_ARGUMENTS(mixin.type),
                        {
                            word: mixin.type,
                        }
                    );
                }
                const refedMixin = {
                    mixin,
                    ref: mixinRefSymbol,
                };
                mixins.push(refedMixin);
            } else {
                context.diagnostics.warn(decl, diagnostics.UNKNOWN_MIXIN(mixin.type), {
                    word: mixin.type,
                });
            }
        }
    );

    if (previousMixins) {
        const partials = previousMixins.filter((r) => r.mixin.partial);
        const nonPartials = previousMixins.filter((r) => !r.mixin.partial);
        const isInPartial = decl.prop === MixinType.PARTIAL;
        if (
            (partials.length && decl.prop === MixinType.PARTIAL) ||
            (nonPartials.length && decl.prop === MixinType.ALL)
        ) {
            context.diagnostics.warn(decl, diagnostics.OVERRIDE_MIXIN(decl.prop));
        }
        if (partials.length && nonPartials.length) {
            mixins = isInPartial ? nonPartials.concat(mixins) : partials.concat(mixins);
        } else if (partials.length) {
            mixins = isInPartial ? mixins : partials.concat(mixins);
        } else if (nonPartials.length) {
            mixins = isInPartial ? nonPartials.concat(mixins) : mixins;
        }
    }
    return mixins;
}

interface ApplyMixinContext {
    transformer: StylableTransformer;
    mixDef: RefedMixin;
    rule: postcss.Rule;
    path: string[];
    cssPropertyMapping: Record<string, string>;
}

export function appendMixin(context: FeatureTransformContext, config: ApplyMixinContext) {
    if (checkRecursive(context, config)) {
        return;
    }
    const resolvedSymbols = context.getResolvedSymbols(context.meta);
    const symbolName = config.mixDef.mixin.type;
    const resolvedType = resolvedSymbols.mainNamespace[symbolName];
    if (resolvedType === `class` || resolvedType === `element`) {
        const resolveChain = resolvedSymbols[resolvedType][symbolName];
        handleCSSMixin(context, config, resolveChain);
        return;
    } else if (resolvedType === `js`) {
        const resolvedMixin = resolvedSymbols.js[symbolName];
        if (typeof resolvedMixin.symbol === 'function') {
            try {
                handleJSMixin(context, config, resolvedMixin.symbol);
            } catch (e) {
                context.diagnostics.error(
                    config.rule,
                    diagnostics.FAILED_TO_APPLY_MIXIN(String(e)),
                    {
                        word: config.mixDef.mixin.type,
                    }
                );
                return;
            }
        } else {
            context.diagnostics.error(config.rule, diagnostics.JS_MIXIN_NOT_A_FUNC(), {
                word: config.mixDef.mixin.type,
            });
        }
        return;
    }

    // ToDo: report on unsupported mixed in symbol type
    const mixinDecl = config.mixDef.mixin.originDecl;
    context.diagnostics.error(mixinDecl, diagnostics.UNKNOWN_MIXIN_SYMBOL(mixinDecl.value), {
        word: mixinDecl.value,
    });
}

function checkRecursive(
    { meta, diagnostics: report }: FeatureTransformContext,
    { mixDef, path, rule }: ApplyMixinContext
) {
    const symbolName =
        mixDef.ref.name === meta.root
            ? mixDef.ref._kind === 'class'
                ? meta.root
                : 'default'
            : mixDef.mixin.type;
    const isRecursive = path.includes(symbolName + ' from ' + meta.source);
    if (isRecursive) {
        // Todo: add test verifying word
        report.warn(rule, diagnostics.CIRCULAR_MIXIN(path), {
            word: symbolName,
        });
        return true;
    }
    return false;
}

function handleJSMixin(
    context: FeatureTransformContext,
    config: ApplyMixinContext,
    mixinFunction: (...args: any[]) => any
) {
    const stVarOverride = context.evaluator.stVarOverride || {};
    const meta = context.meta;
    const mixDef = config.mixDef;
    const res = mixinFunction((mixDef.mixin.options as any[]).map((v) => v.value));
    const mixinRoot = cssObjectToAst(res).root;

    mixinRoot.walkDecls((decl) => {
        if (!isValidDeclaration(decl)) {
            decl.value = String(decl);
        }
    });

    config.transformer.transformAst(mixinRoot, meta, undefined, stVarOverride, [], true);
    const mixinPath = (mixDef.ref as ImportSymbol).import.request;
    fixRelativeUrls(
        mixinRoot,
        context.resolver.resolvePath(dirname(meta.source), mixinPath),
        meta.source
    );

    mergeRules(mixinRoot, config.rule, mixDef.mixin.originDecl, context.diagnostics);
}

function handleCSSMixin(
    context: FeatureTransformContext,
    config: ApplyMixinContext,
    resolveChain: CSSResolve<ClassSymbol | ElementSymbol>[]
) {
    const mixDef = config.mixDef;
    const isPartial = mixDef.mixin.partial;
    const namedArgs = mixDef.mixin.options as Record<string, string>;
    const overrideKeys = Object.keys(namedArgs);

    if (isPartial && overrideKeys.length === 0) {
        return;
    }

    const roots = [];
    for (const resolved of resolveChain) {
        roots.push(createMixinRootFromCSSResolve(context, config, resolved));
        if (resolved.symbol[`-st-extends`]) {
            break;
        }
    }

    if (roots.length === 1) {
        mergeRules(roots[0], config.rule, mixDef.mixin.originDecl, config.transformer.diagnostics);
    } else if (roots.length > 1) {
        const mixinRoot = postcss.root();
        roots.forEach((root) => mixinRoot.prepend(...root.nodes));
        mergeRules(mixinRoot, config.rule, mixDef.mixin.originDecl, config.transformer.diagnostics);
    }
}

function createMixinRootFromCSSResolve(
    context: FeatureTransformContext,
    config: ApplyMixinContext,
    resolvedClass: CSSResolve
) {
    const stVarOverride = context.evaluator.stVarOverride || {};
    const meta = context.meta;
    const mixDef = config.mixDef;
    const isRootMixin = resolvedClass.symbol.name === resolvedClass.meta.root;
    const mixinRoot = createSubsetAst<postcss.Root>(
        resolvedClass.meta.ast,
        (resolvedClass.symbol._kind === 'class' ? '.' : '') + resolvedClass.symbol.name,
        undefined,
        isRootMixin,
        meta.customSelectors
    );

    const namedArgs = mixDef.mixin.options as Record<string, string>;

    if (mixDef.mixin.partial) {
        filterPartialMixinDecl(meta, mixinRoot, Object.keys(namedArgs));
    }

    const resolvedArgs = resolveArgumentsValue(
        namedArgs,
        config.transformer,
        context.meta,
        context.diagnostics,
        mixDef.mixin.originDecl,
        stVarOverride,
        config.path,
        config.cssPropertyMapping
    );

    const mixinMeta: StylableMeta = resolvedClass.meta;
    const symbolName = isRootMixin && resolvedClass.meta !== meta ? 'default' : mixDef.mixin.type;

    config.transformer.transformAst(
        mixinRoot,
        mixinMeta,
        undefined,
        resolvedArgs,
        config.path.concat(symbolName + ' from ' + meta.source),
        true,
        resolvedClass.symbol.name
    );

    fixRelativeUrls(mixinRoot, mixinMeta.source, meta.source);

    return mixinRoot;
}

/** we assume that mixinRoot is freshly created nodes from the ast */
function filterPartialMixinDecl(
    meta: StylableMeta,
    mixinRoot: postcss.Root,
    overrideKeys: string[]
) {
    let regexp: RegExp;
    const overrideSet = new Set(overrideKeys);
    let size;
    do {
        size = overrideSet.size;
        regexp = new RegExp(`value\\((\\s*${Array.from(overrideSet).join('\\s*)|(\\s*')}\\s*)\\)`);
        for (const { text, name } of Object.values(meta.getAllStVars())) {
            if (!overrideSet.has(name) && text.match(regexp)) {
                overrideSet.add(name);
            }
        }
    } while (overrideSet.size !== size);

    mixinRoot.walkDecls((decl) => {
        if (!decl.value.match(regexp)) {
            const parent = decl.parent;
            decl.remove();
            if (parent?.nodes?.length === 0) {
                parent.remove();
            }
        }
    });
}
