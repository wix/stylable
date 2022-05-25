import { createFeature, FeatureContext, FeatureTransformContext } from './feature';
import * as STSymbol from './st-symbol';
import type { ImportSymbol } from './st-import';
import * as STCustomSelector from './st-custom-selector';
import * as STVar from './st-var';
import type { ElementSymbol } from './css-type';
import type { ClassSymbol } from './css-class';
import { createSubsetAst } from '../helpers/rule';
import { mixinHelperDiagnostics, parseStMixin, parseStPartialMixin } from '../helpers/mixin';
import { resolveArgumentsValue } from '../functions';
import { cssObjectToAst } from '../parser';
import * as postcss from 'postcss';
import type { FunctionNode, WordNode } from 'postcss-value-parser';
import { fixRelativeUrls } from '../stylable-assets';
import { isValidDeclaration, mergeRules, utilDiagnostics } from '../stylable-utils';
import type { StylableMeta } from '../stylable-meta';
import type { CSSResolve } from '../stylable-resolver';
import type { StylableTransformer } from '../stylable-transformer';
import { dirname } from 'path';
import { createDiagnosticReporter, Diagnostics } from '../diagnostics';
import type { Stylable } from '../stylable';

export interface MixinValue {
    type: string;
    options: Array<{ value: string }> | Record<string, string>;
    partial?: boolean;
    valueNode?: FunctionNode | WordNode;
    originDecl: postcss.Declaration;
}

export interface AnalyzedMixin<VALID extends 'valid' | 'invalid'> {
    data: MixinValue;
    symbol: VALID extends 'valid'
        ? ImportSymbol | ClassSymbol | ElementSymbol
        : STSymbol.StylableSymbol | undefined;
}

export type MixinReflection =
    | {
          name: string;
          kind: 'css-fragment';
          args: Record<string, string>[];
          optionalArgs: Map<string, { name: string }>;
      }
    | { name: string; kind: 'js-func'; args: string[] }
    | { name: string; kind: 'invalid'; args: never[] };

export const MixinType = {
    ALL: `-st-mixin` as const,
    PARTIAL: `-st-partial-mixin` as const,
};

export const diagnostics = {
    VALUE_CANNOT_BE_STRING: mixinHelperDiagnostics.VALUE_CANNOT_BE_STRING,
    INVALID_NAMED_PARAMS: mixinHelperDiagnostics.INVALID_NAMED_PARAMS,
    INVALID_MERGE_OF: utilDiagnostics.INVALID_MERGE_OF,
    PARTIAL_MIXIN_MISSING_ARGUMENTS: createDiagnosticReporter(
        '10001',
        'error',
        (type: string) =>
            `"${MixinType.PARTIAL}" can only be used with override arguments provided, missing overrides on "${type}"`
    ),
    UNKNOWN_MIXIN: createDiagnosticReporter(
        '10002',
        'error',
        (name: string) => `unknown mixin: "${name}"`
    ),
    OVERRIDE_MIXIN: createDiagnosticReporter(
        '10003',
        'warning',
        (mixinType: string) => `override ${mixinType} on same rule`
    ),
    FAILED_TO_APPLY_MIXIN: createDiagnosticReporter(
        '10004',
        'error',
        (error: string) => `could not apply mixin: ${error}`
    ),
    JS_MIXIN_NOT_A_FUNC: createDiagnosticReporter(
        '10005',
        'error',
        () => `js mixin must be a function`
    ),
    UNKNOWN_MIXIN_SYMBOL: createDiagnosticReporter(
        '10007',
        'error',
        (name: string) => `cannot mixin unknown symbol "${name}"`
    ),
    CIRCULAR_MIXIN: createDiagnosticReporter(
        '10006',
        'error',
        (circularPaths: string[]) => `circular mixin found: ${circularPaths.join(' --> ')}`
    ),
};

// HOOKS

export const hooks = createFeature({
    transformLastPass({ context, ast, transformer, cssVarsMapping, path }) {
        ast.walkRules((rule) => appendMixins(context, transformer, rule, cssVarsMapping, path));
    },
});

// API
export class StylablePublicApi {
    constructor(private stylable: Stylable) {}
    public resolveExpr(
        meta: StylableMeta,
        expr: string,
        {
            diagnostics = new Diagnostics(),
            resolveOptionalArgs = false,
        }: { diagnostics?: Diagnostics; resolveOptionalArgs?: boolean } = {}
    ) {
        const resolvedSymbols = this.stylable.resolver.resolveSymbols(meta, diagnostics);
        const { mainNamespace } = resolvedSymbols;
        const analyzedMixins = collectDeclMixins(
            { meta, diagnostics },
            postcss.decl({ prop: '-st-mixin', value: expr }),
            (mixinSymbolName) => (mainNamespace[mixinSymbolName] === 'js' ? 'args' : 'named')
        );
        const result: MixinReflection[] = [];
        for (const { data } of analyzedMixins) {
            const name = data.type;
            const symbolKind = mainNamespace[name];
            if (symbolKind === 'class' || symbolKind === 'element') {
                const mixRef: MixinReflection = {
                    name,
                    kind: 'css-fragment',
                    args: [],
                    optionalArgs: new Map(),
                };
                for (const [argName, argValue] of Object.entries(data.options)) {
                    mixRef.args.push({ [argName]: argValue });
                }
                if (resolveOptionalArgs) {
                    const varMap = new Map<string, { name: string }>();
                    const resolveChain = resolvedSymbols[symbolKind][name];
                    getCSSMixinRoots(meta, resolveChain, ({ mixinRoot }) => {
                        mixinRoot.walkDecls((decl) => {
                            const varNames = STVar.parseVarsFromExpr(decl.value);
                            varNames.forEach((name) => varMap.set(name, { name }));
                        });
                    });
                    mixRef.optionalArgs = varMap;
                }
                result.push(mixRef);
            } else if (
                symbolKind === 'js' &&
                typeof resolvedSymbols.js[name].symbol === 'function'
            ) {
                const mixRef: MixinReflection = { name, kind: 'js-func', args: [] };
                for (const arg of Object.values(data.options)) {
                    mixRef.args.push(arg.value);
                }
                result.push(mixRef);
            } else {
                result.push({ name, kind: 'invalid', args: [] });
            }
        }
        return result;
    }
}

function appendMixins(
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
): [decls: postcss.Declaration[], mixins: AnalyzedMixin<'valid'>[]] {
    let mixins: AnalyzedMixin<'invalid'>[] = [];
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
    return [
        decls,
        mixins
            .map((mixin) => {
                switch (mixin.symbol?._kind) {
                    case 'class':
                    case 'element':
                    case 'import':
                        return mixin;
                    default:
                        return;
                }
            })
            .filter((mixin) => mixin !== undefined) as any as AnalyzedMixin<'valid'>[],
    ];
}

function collectDeclMixins(
    context: Pick<FeatureContext, 'meta' | 'diagnostics'>,
    decl: postcss.Declaration,
    paramSignature: (mixinSymbolName: string) => 'named' | 'args',
    previousMixins?: AnalyzedMixin<'invalid'>[]
): AnalyzedMixin<'invalid'>[] {
    const { meta } = context;
    let mixins: AnalyzedMixin<'invalid'>[] = [];
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
            mixins.push({
                data: mixin,
                symbol: mixinRefSymbol,
            });
            if (
                mixinRefSymbol &&
                (mixinRefSymbol._kind === 'import' ||
                    mixinRefSymbol._kind === 'class' ||
                    mixinRefSymbol._kind === 'element')
            ) {
                if (mixin.partial && Object.keys(mixin.options).length === 0) {
                    context.diagnostics.report(
                        diagnostics.PARTIAL_MIXIN_MISSING_ARGUMENTS(mixin.type),
                        {
                            node: decl,
                            word: mixin.type,
                        }
                    );
                }
            } else {
                context.diagnostics.report(diagnostics.UNKNOWN_MIXIN(mixin.type), {
                    node: decl,
                    word: mixin.type,
                });
            }
        }
    );

    if (previousMixins) {
        const partials = previousMixins.filter((r) => r.data.partial);
        const nonPartials = previousMixins.filter((r) => !r.data.partial);
        const isInPartial = decl.prop === MixinType.PARTIAL;
        if (
            (partials.length && decl.prop === MixinType.PARTIAL) ||
            (nonPartials.length && decl.prop === MixinType.ALL)
        ) {
            context.diagnostics.report(diagnostics.OVERRIDE_MIXIN(decl.prop), { node: decl });
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
    mixDef: AnalyzedMixin<'valid'>;
    rule: postcss.Rule;
    path: string[];
    cssPropertyMapping: Record<string, string>;
}

function appendMixin(context: FeatureTransformContext, config: ApplyMixinContext) {
    if (checkRecursive(context, config)) {
        return;
    }
    const resolvedSymbols = context.getResolvedSymbols(context.meta);
    const symbolName = config.mixDef.data.type;
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
                context.diagnostics.report(diagnostics.FAILED_TO_APPLY_MIXIN(String(e)), {
                    node: config.rule,
                    word: config.mixDef.data.type,
                });
                return;
            }
        } else {
            context.diagnostics.report(diagnostics.JS_MIXIN_NOT_A_FUNC(), {
                node: config.rule,
                word: config.mixDef.data.type,
            });
        }
        return;
    }

    // ToDo: report on unsupported mixed in symbol type
    const mixinDecl = config.mixDef.data.originDecl;
    context.diagnostics.report(diagnostics.UNKNOWN_MIXIN_SYMBOL(mixinDecl.value), {
        node: mixinDecl,
        word: mixinDecl.value,
    });
}

function checkRecursive(
    { meta, diagnostics: report }: FeatureTransformContext,
    { mixDef, path, rule }: ApplyMixinContext
) {
    const symbolName =
        mixDef.symbol.name === meta.root
            ? mixDef.symbol._kind === 'class'
                ? meta.root
                : 'default'
            : mixDef.data.type;
    const isRecursive = path.includes(symbolName + ' from ' + meta.source);
    if (isRecursive) {
        // Todo: add test verifying word
        report.report(diagnostics.CIRCULAR_MIXIN(path), {
            node: rule,
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
    const res = mixinFunction((mixDef.data.options as any[]).map((v) => v.value));
    const mixinRoot = cssObjectToAst(res).root;

    mixinRoot.walkDecls((decl) => {
        if (!isValidDeclaration(decl)) {
            decl.value = String(decl);
        }
    });

    config.transformer.transformAst(mixinRoot, meta, undefined, stVarOverride, [], true);
    const mixinPath = (mixDef.symbol as ImportSymbol).import.request;
    fixRelativeUrls(
        mixinRoot,
        context.resolver.resolvePath(dirname(meta.source), mixinPath),
        meta.source
    );

    mergeRules(mixinRoot, config.rule, mixDef.data.originDecl, context.diagnostics);
}

function handleCSSMixin(
    context: FeatureTransformContext,
    config: ApplyMixinContext,
    resolveChain: CSSResolve<ClassSymbol | ElementSymbol>[]
) {
    const mixDef = config.mixDef;
    const isPartial = mixDef.data.partial;
    const namedArgs = mixDef.data.options as Record<string, string>;
    const overrideKeys = Object.keys(namedArgs);

    if (isPartial && overrideKeys.length === 0) {
        return;
    }

    const roots = getCSSMixinRoots(
        context.meta,
        resolveChain,
        ({ mixinRoot, resolvedClass, isRootMixin }) => {
            const stVarOverride = context.evaluator.stVarOverride || {};
            const mixDef = config.mixDef;
            const namedArgs = mixDef.data.options as Record<string, string>;

            if (mixDef.data.partial) {
                filterPartialMixinDecl(context.meta, mixinRoot, Object.keys(namedArgs));
            }

            const resolvedArgs = resolveArgumentsValue(
                namedArgs,
                config.transformer,
                context.meta,
                context.diagnostics,
                mixDef.data.originDecl,
                stVarOverride,
                config.path,
                config.cssPropertyMapping
            );

            const mixinMeta: StylableMeta = resolvedClass.meta;
            const symbolName =
                isRootMixin && resolvedClass.meta !== context.meta ? 'default' : mixDef.data.type;

            config.transformer.transformAst(
                mixinRoot,
                mixinMeta,
                undefined,
                resolvedArgs,
                config.path.concat(symbolName + ' from ' + context.meta.source),
                true,
                resolvedClass.symbol.name
            );
            fixRelativeUrls(mixinRoot, resolvedClass.meta.source, context.meta.source);
        }
    );

    if (roots.length === 1) {
        mergeRules(roots[0], config.rule, mixDef.data.originDecl, config.transformer.diagnostics);
    } else if (roots.length > 1) {
        const mixinRoot = postcss.root();
        roots.forEach((root) => mixinRoot.prepend(...root.nodes));
        mergeRules(mixinRoot, config.rule, mixDef.data.originDecl, config.transformer.diagnostics);
    }
}

function getCSSMixinRoots(
    contextMeta: StylableMeta,
    resolveChain: CSSResolve<ClassSymbol | ElementSymbol>[],
    processMixinRoot: (data: {
        mixinRoot: postcss.Root;
        resolvedClass: CSSResolve;
        isRootMixin: boolean;
    }) => void
) {
    const roots = [];
    for (const resolved of resolveChain) {
        const isRootMixin = resolved.symbol.name === resolved.meta.root;
        const mixinRoot = createSubsetAst<postcss.Root>(
            resolved.meta.sourceAst,
            (resolved.symbol._kind === 'class' ? '.' : '') + resolved.symbol.name,
            undefined,
            isRootMixin,
            (name) => STCustomSelector.getCustomSelector(contextMeta, name)
        );
        processMixinRoot({ mixinRoot, resolvedClass: resolved, isRootMixin });
        roots.push(mixinRoot);
        if (resolved.symbol[`-st-extends`]) {
            break;
        }
    }
    return roots;
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
