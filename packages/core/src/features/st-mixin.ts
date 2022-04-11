import { createFeature } from './feature';
import * as STSymbol from './st-symbol';
import type { ImportSymbol } from './st-import';
import type { ClassSymbol } from './css-class';
import {
    diagnostics as MixinHelperDiagnostics,
    parseStMixin,
    parseStPartialMixin,
} from '../helpers/mixin';
import { ignoreDeprecationWarn } from '../helpers/deprecation';
import * as postcss from 'postcss';
import type { FunctionNode, WordNode } from 'postcss-value-parser';
import { isValidDeclaration, mergeRules, INVALID_MERGE_OF } from '../stylable-utils';
// ToDo: deprecate - stop usage
import type { SRule } from '../deprecated/postcss-ast-extension';

export interface MixinValue {
    type: string;
    options: Array<{ value: string }> | Record<string, string>;
    partial?: boolean;
    valueNode?: FunctionNode | WordNode;
    originDecl?: postcss.Declaration;
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
};

// HOOKS

export const hooks = createFeature({
    analyzeDeclaration({ context, decl }) {
        const parser =
            decl.prop === MixinType.ALL
                ? parseStMixin
                : decl.prop === MixinType.PARTIAL
                ? parseStPartialMixin
                : null;
        if (!parser) {
            return;
        }
        const rule = decl.parent as SRule;
        const { meta } = context;
        const mixins: RefedMixin[] = [];
        /**
         * This functionality is broken we don't know what strategy to choose here.
         * Should be fixed when we refactor to the new flow
         */
        parser(
            decl,
            (type) => {
                const symbol = STSymbol.get(meta, type);
                return symbol?._kind === 'import' && !symbol.import.from.match(/.css$/)
                    ? 'args'
                    : 'named';
            },
            context.diagnostics,
            false
        ).forEach((mixin) => {
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
                ignoreDeprecationWarn(() => meta.mixins).push(refedMixin);
            } else {
                context.diagnostics.warn(decl, diagnostics.UNKNOWN_MIXIN(mixin.type), {
                    word: mixin.type,
                });
            }
        });

        const previousMixins = ignoreDeprecationWarn(() => rule.mixins);
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
                rule.mixins = isInPartial ? nonPartials.concat(mixins) : partials.concat(mixins);
            } else if (partials.length) {
                rule.mixins = isInPartial ? mixins : partials.concat(mixins);
            } else if (nonPartials.length) {
                rule.mixins = isInPartial ? nonPartials.concat(mixins) : mixins;
            }
        } else if (mixins.length) {
            rule.mixins = mixins;
        }
    },
    transformLastPass({ context, ast, transformer, cssVarsMapping, path }) {
        ast.walkRules((rule) =>
            appendMixins(
                context,
                transformer,
                rule as SRule,
                context.meta,
                context.evaluator.stVarOverride || {},
                cssVarsMapping,
                path
            )
        );
    },
});

// taken from "src/stylable/mixins" - ToDo: refactor

import { dirname } from 'path';
import type { Diagnostics } from '../diagnostics';
import { resolveArgumentsValue } from '../functions';
import { cssObjectToAst } from '../parser';
import { fixRelativeUrls } from '../stylable-assets';
import type { StylableMeta } from '../stylable-meta';
import type { ElementSymbol } from './css-type';
import type { FeatureTransformContext } from './feature';
import type { CSSResolve } from '../stylable-resolver';
import type { StylableTransformer } from '../stylable-transformer';
import { createSubsetAst } from '../helpers/rule';
import { strategies } from '../helpers/value';
import { valueMapping, mixinDeclRegExp } from '../stylable-value-parsers';

export const mixinWarnings = {
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

export function appendMixins(
    context: FeatureTransformContext,
    transformer: StylableTransformer,
    rule: SRule,
    meta: StylableMeta,
    variableOverride: Record<string, string>,
    cssVarsMapping: Record<string, string>,
    path: string[] = []
) {
    const mixins = ignoreDeprecationWarn(() => rule.mixins);
    if (!mixins || mixins.length === 0) {
        return;
    }
    mixins.forEach((mix) => {
        appendMixin(context, mix, transformer, rule, meta, variableOverride, cssVarsMapping, path);
    });
    mixins.length = 0;
    rule.walkDecls(mixinDeclRegExp, (node) => {
        node.remove();
    });
}

export function appendMixin(
    context: FeatureTransformContext,
    mix: RefedMixin,
    transformer: StylableTransformer,
    rule: SRule,
    meta: StylableMeta,
    variableOverride: Record<string, string>,
    cssVarsMapping: Record<string, string>,
    path: string[] = []
) {
    if (checkRecursive(context.diagnostics, meta, mix, rule, path)) {
        return;
    }

    const resolvedSymbols = context.getResolvedSymbols(meta);
    const symbolName = mix.mixin.type;
    const resolvedType = resolvedSymbols.mainNamespace[symbolName];
    if (resolvedType === `class` || resolvedType === `element`) {
        const resolveChain = resolvedSymbols[resolvedType][symbolName];
        handleCSSMixin(
            resolveChain,
            transformer,
            reParseMixinNamedArgs(mix, rule, context.diagnostics),
            rule,
            meta,
            path,
            variableOverride,
            cssVarsMapping
        );
        return;
    } else if (resolvedType === `js`) {
        const resolvedMixin = resolvedSymbols.js[symbolName];
        if (typeof resolvedMixin.symbol === 'function') {
            try {
                handleJSMixin(
                    transformer,
                    reParseMixinArgs(mix, rule, context.diagnostics),
                    resolvedMixin.symbol,
                    meta,
                    rule,
                    variableOverride
                );
            } catch (e) {
                context.diagnostics.error(rule, mixinWarnings.FAILED_TO_APPLY_MIXIN(String(e)), {
                    word: mix.mixin.type,
                });
                return;
            }
        } else {
            context.diagnostics.error(rule, mixinWarnings.JS_MIXIN_NOT_A_FUNC(), {
                word: mix.mixin.type,
            });
        }
        return;
    }

    // ToDo: report on unsupported mixed in symbol type
    const mixinDecl = getMixinDeclaration(rule);
    if (mixinDecl) {
        // ToDo: report on rule if decl is not found
        context.diagnostics.error(mixinDecl, mixinWarnings.UNKNOWN_MIXIN_SYMBOL(mixinDecl.value), {
            word: mixinDecl.value,
        });
    }
}

function checkRecursive(
    diagnostics: Diagnostics,
    meta: StylableMeta,
    mix: RefedMixin,
    rule: postcss.Rule,
    path: string[]
) {
    const symbolName =
        mix.ref.name === meta.root
            ? mix.ref._kind === 'class'
                ? meta.root
                : 'default'
            : mix.mixin.type;
    const isRecursive = path.includes(symbolName + ' from ' + meta.source);
    if (isRecursive) {
        // Todo: add test verifying word
        diagnostics.warn(rule, mixinWarnings.CIRCULAR_MIXIN(path), {
            word: symbolName,
        });
        return true;
    }
    return false;
}

function handleJSMixin(
    transformer: StylableTransformer,
    mix: RefedMixin,
    mixinFunction: (...args: any[]) => any,
    meta: StylableMeta,
    rule: postcss.Rule,
    variableOverride?: Record<string, string>
) {
    const res = mixinFunction((mix.mixin.options as any[]).map((v) => v.value));
    const mixinRoot = cssObjectToAst(res).root;

    mixinRoot.walkDecls((decl) => {
        if (!isValidDeclaration(decl)) {
            decl.value = String(decl);
        }
    });

    transformer.transformAst(mixinRoot, meta, undefined, variableOverride, [], true);
    const mixinPath = (mix.ref as ImportSymbol).import.request;
    fixRelativeUrls(
        mixinRoot,
        transformer.resolver.resolvePath(dirname(meta.source), mixinPath),
        meta.source
    );

    mergeRules(mixinRoot, rule, transformer.diagnostics);
}

function createMixinRootFromCSSResolve(
    transformer: StylableTransformer,
    mix: RefedMixin,
    meta: StylableMeta,
    resolvedClass: CSSResolve,
    path: string[],
    decl: postcss.Declaration,
    variableOverride: Record<string, string>,
    cssVarsMapping: Record<string, string>
) {
    const isRootMixin = resolvedClass.symbol.name === resolvedClass.meta.root;
    const mixinRoot = createSubsetAst<postcss.Root>(
        resolvedClass.meta.ast,
        (resolvedClass.symbol._kind === 'class' ? '.' : '') + resolvedClass.symbol.name,
        undefined,
        isRootMixin
    );

    const namedArgs = mix.mixin.options as Record<string, string>;

    if (mix.mixin.partial) {
        filterPartialMixinDecl(meta, mixinRoot, Object.keys(namedArgs));
    }

    const resolvedArgs = resolveArgumentsValue(
        namedArgs,
        transformer,
        meta,
        transformer.diagnostics,
        decl,
        variableOverride,
        path,
        cssVarsMapping
    );

    const mixinMeta: StylableMeta = resolvedClass.meta;
    const symbolName = isRootMixin && resolvedClass.meta !== meta ? 'default' : mix.mixin.type;

    transformer.transformAst(
        mixinRoot,
        mixinMeta,
        undefined,
        resolvedArgs,
        path.concat(symbolName + ' from ' + meta.source),
        true,
        resolvedClass.symbol.name
    );

    fixRelativeUrls(mixinRoot, mixinMeta.source, meta.source);

    return mixinRoot;
}

function handleCSSMixin(
    resolveChain: CSSResolve<ClassSymbol | ElementSymbol>[],
    transformer: StylableTransformer,
    mix: RefedMixin,
    rule: postcss.Rule,
    meta: StylableMeta,
    path: string[],
    variableOverride: Record<string, string>,
    cssVarsMapping: Record<string, string>
) {
    const isPartial = mix.mixin.partial;
    const namedArgs = mix.mixin.options as Record<string, string>;
    const overrideKeys = Object.keys(namedArgs);

    if (isPartial && overrideKeys.length === 0) {
        return;
    }

    const mixinDecl = getMixinDeclaration(rule) || postcss.decl();

    const roots = [];
    for (let i = 0; i < resolveChain.length; ++i) {
        const resolved = resolveChain[i];
        roots.push(
            createMixinRootFromCSSResolve(
                transformer,
                mix,
                meta,
                resolved,
                path,
                mixinDecl,
                variableOverride,
                cssVarsMapping
            )
        );
        if (resolved.symbol[valueMapping.extends]) {
            break;
        }
    }

    if (roots.length === 1) {
        mergeRules(roots[0], rule, transformer.diagnostics);
    } else if (roots.length > 1) {
        const mixinRoot = postcss.root();
        roots.forEach((root) => mixinRoot.prepend(...root.nodes));
        mergeRules(mixinRoot, rule, transformer.diagnostics);
    }
}

function getMixinDeclaration(rule: postcss.Rule): postcss.Declaration | undefined {
    return (
        rule.nodes &&
        (rule.nodes.find((node) => {
            return (
                node.type === 'decl' &&
                (node.prop === valueMapping.mixin || node.prop === valueMapping.partialMixin)
            );
        }) as postcss.Declaration)
    );
}
const partialsOnly = ({ mixin: { partial } }: RefedMixin): boolean => {
    return !!partial;
};
const nonPartials = ({ mixin: { partial } }: RefedMixin): boolean => {
    return !partial;
};

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
            const parent = decl.parent as SRule; // ref the parent before remove
            decl.remove();
            if (parent?.nodes?.length === 0) {
                parent.remove();
            } else if (parent) {
                ignoreDeprecationWarn(() => {
                    if (decl.prop === valueMapping.mixin) {
                        parent.mixins = parent.mixins!.filter(partialsOnly);
                    } else if (decl.prop === valueMapping.partialMixin) {
                        parent.mixins = parent.mixins!.filter(nonPartials);
                    }
                });
            }
        }
    });
}

/** this is a workaround for parsing the mixin args too early  */
function reParseMixinNamedArgs(
    mix: RefedMixin,
    rule: postcss.Rule,
    diagnostics: Diagnostics
): RefedMixin {
    const options =
        mix.mixin.valueNode?.type === 'function'
            ? strategies.named(mix.mixin.valueNode, (message, options) => {
                  diagnostics.warn(mix.mixin.originDecl || rule, message, options);
              })
            : (mix.mixin.options as Record<string, string>) || {};

    return {
        ...mix,
        mixin: {
            ...mix.mixin,
            options,
        },
    };
}

function reParseMixinArgs(
    mix: RefedMixin,
    rule: postcss.Rule,
    diagnostics: Diagnostics
): RefedMixin {
    const options =
        mix.mixin.valueNode?.type === 'function'
            ? strategies.args(mix.mixin.valueNode, (message, options) => {
                  diagnostics.warn(mix.mixin.originDecl || rule, message, options);
              })
            : Array.isArray(mix.mixin.options)
            ? (mix.mixin.options as { value: string }[])
            : [];

    return {
        ...mix,
        mixin: {
            ...mix.mixin,
            options,
        },
    };
}
