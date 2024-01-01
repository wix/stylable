import { createFeature, FeatureTransformContext } from './feature';
import * as STSymbol from './st-symbol';
import type { ImportSymbol } from './st-import';
import * as STCustomSelector from './st-custom-selector';
import * as STVar from './st-var';
import type { ElementSymbol } from './css-type';
import type { ClassSymbol } from './css-class';
import { createSubsetAst, isStMixinMarker } from '../helpers/rule';
import { scopeNestedSelector } from '../helpers/selector';
import { mixinHelperDiagnostics, parseStMixin, parseStPartialMixin } from '../helpers/mixin';
import { resolveArgumentsValue } from '../functions';
import { cssObjectToAst } from '../parser';
import * as postcss from 'postcss';
import postcssValueParser, { FunctionNode, WordNode } from 'postcss-value-parser';
import { fixRelativeUrls } from '../stylable-assets';
import { isValidDeclaration, mergeRules, utilDiagnostics } from '../stylable-utils';
import type { StylableMeta } from '../stylable-meta';
import type { CSSResolve, MetaResolvedSymbols } from '../stylable-resolver';
import type { StylableTransformer } from '../stylable-transformer';
import { dirname } from 'path';
import { createDiagnosticReporter, Diagnostics } from '../diagnostics';
import type { Stylable } from '../stylable';
import { parseCssSelector } from '@tokey/css-selector-parser';

export interface MixinValue {
    type: string;
    options: Array<{ value: string }> | Record<string, string>;
    partial?: boolean;
    valueNode?: FunctionNode | WordNode;
    originDecl: postcss.Declaration;
}

export type ValidMixinSymbols = ImportSymbol | ClassSymbol | ElementSymbol;

export type AnalyzedMixin =
    | {
          valid: true;
          data: MixinValue;
          symbol: ValidMixinSymbols;
      }
    | {
          valid: false;
          data: MixinValue;
          symbol: Exclude<STSymbol.StylableSymbol, ValidMixinSymbols> | undefined;
      };

export type MixinReflection =
    | {
          name: string;
          kind: 'css-fragment';
          args: Record<string, string>[];
          optionalArgs: Map<string, { name: string }>;
      }
    | { name: string; kind: 'js-func'; args: string[]; func: (...args: any[]) => any }
    | { name: string; kind: 'invalid'; args: string };

export const MixinType = {
    ALL: `-st-mixin` as const,
    PARTIAL: `-st-partial-mixin` as const,
};

export const diagnostics = {
    VALUE_CANNOT_BE_STRING: mixinHelperDiagnostics.VALUE_CANNOT_BE_STRING,
    INVALID_NAMED_PARAMS: mixinHelperDiagnostics.INVALID_NAMED_PARAMS,
    INVALID_MERGE_OF: utilDiagnostics.INVALID_MERGE_OF,
    INVALID_RECURSIVE_MIXIN: utilDiagnostics.INVALID_RECURSIVE_MIXIN,
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
    UNSUPPORTED_MIXIN_SYMBOL: createDiagnosticReporter(
        '10007',
        'error',
        (name: string, symbolType: STSymbol.StylableSymbol['_kind']) =>
            `cannot mix unsupported symbol "${name}" of type "${STSymbol.readableTypeMap[symbolType]}"`
    ),
    CIRCULAR_MIXIN: createDiagnosticReporter(
        '10006',
        'error',
        (circularPaths: string[]) => `circular mixin found: ${circularPaths.join(' --> ')}`
    ),
    UNKNOWN_ARG: createDiagnosticReporter(
        '10009',
        'warning',
        (argName) => `unknown mixin argument "${argName}"`
    ),
};

// HOOKS

export const hooks = createFeature({
    transformSelectorNode({ selectorContext, node }) {
        const isMarker = isStMixinMarker(node);
        if (isMarker) {
            selectorContext.setNextSelectorScope(
                selectorContext.inferredSelectorMixin,
                node,
                node.value
            );
        }
        return isMarker;
    },
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
            resolvedSymbols,
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
                        const names = new Set<string>();
                        collectOptionalArgs(
                            { meta, resolver: this.stylable.resolver },
                            mixinRoot,
                            names
                        );
                        names.forEach((name) => varMap.set(name, { name }));
                    });
                    mixRef.optionalArgs = varMap;
                }
                result.push(mixRef);
            } else if (
                symbolKind === 'js' &&
                typeof resolvedSymbols.js[name].symbol === 'function'
            ) {
                const mixRef: MixinReflection = {
                    name,
                    kind: 'js-func',
                    args: [],
                    func: resolvedSymbols.js[name].symbol,
                };
                for (const arg of Object.values(data.options)) {
                    mixRef.args.push(arg.value);
                }
                result.push(mixRef);
            } else {
                result.push({
                    name,
                    kind: 'invalid',
                    args:
                        data.valueNode?.type === 'function'
                            ? postcssValueParser.stringify(data.valueNode.nodes)
                            : '',
                });
            }
        }
        return result;
    }
    public scopeNestedSelector(scopeSelector: string, nestSelector: string): string {
        return scopeNestedSelector(parseCssSelector(scopeSelector), parseCssSelector(nestSelector))
            .selector;
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
        if (mixin.valid) {
            appendMixin(context, { transformer, mixDef: mixin, rule, path, cssPropertyMapping });
        }
    }
    for (const mixinDecl of decls) {
        mixinDecl.remove();
    }
}

function collectRuleMixins(
    context: FeatureTransformContext,
    rule: postcss.Rule
): [decls: postcss.Declaration[], mixins: AnalyzedMixin[]] {
    let mixins: AnalyzedMixin[] = [];
    const resolvedSymbols = context.getResolvedSymbols(context.meta);
    const { mainNamespace } = resolvedSymbols;
    const decls: postcss.Declaration[] = [];
    for (const node of rule.nodes) {
        if (
            node.type === 'decl' &&
            (node.prop === `-st-mixin` || node.prop === `-st-partial-mixin`)
        ) {
            decls.push(node);
            mixins = collectDeclMixins(
                context,
                resolvedSymbols,
                node,
                (mixinSymbolName) => {
                    return mainNamespace[mixinSymbolName] === 'js' ? 'args' : 'named';
                },
                mixins
            );
        }
    }
    return [decls, mixins];
}

function collectDeclMixins(
    context: Pick<FeatureTransformContext, 'meta' | 'diagnostics'>,
    resolvedSymbols: MetaResolvedSymbols,
    decl: postcss.Declaration,
    paramSignature: (mixinSymbolName: string) => 'named' | 'args',
    previousMixins?: AnalyzedMixin[]
): AnalyzedMixin[] {
    const { meta } = context;
    let mixins: AnalyzedMixin[] = [];
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
            const symbolName = mixin.type;
            const resolvedType = resolvedSymbols.mainNamespace[symbolName];
            if (
                resolvedType &&
                ((resolvedType === 'js' &&
                    typeof resolvedSymbols.js[symbolName].symbol === 'function') ||
                    resolvedType === 'class' ||
                    resolvedType === 'element')
            ) {
                mixins.push({
                    valid: true,
                    data: mixin,
                    symbol: mixinRefSymbol as ValidMixinSymbols,
                });
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
                mixins.push({
                    valid: false,
                    data: mixin,
                    symbol: mixinRefSymbol as
                        | Exclude<STSymbol.StylableSymbol, ValidMixinSymbols>
                        | undefined,
                });
                if (resolvedType === 'js') {
                    context.diagnostics.report(diagnostics.JS_MIXIN_NOT_A_FUNC(), {
                        node: decl,
                        word: mixin.type,
                    });
                } else if (resolvedType) {
                    context.diagnostics.report(
                        diagnostics.UNSUPPORTED_MIXIN_SYMBOL(mixin.type, resolvedType),
                        {
                            node: decl,
                            word: mixin.type,
                        }
                    );
                } else {
                    context.diagnostics.report(diagnostics.UNKNOWN_MIXIN(mixin.type), {
                        node: decl,
                        word: mixin.type,
                    });
                }
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
    mixDef: AnalyzedMixin & { valid: true };
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
        }
        return;
    }
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
    const mixinRoot = cssObjectToAst(res);

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

    mergeRules(mixinRoot, config.rule, mixDef.data.originDecl, context.diagnostics, true);
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

    const optionalArgs = new Set<string>();
    const roots = getCSSMixinRoots(
        context.meta,
        resolveChain,
        ({ mixinRoot, resolved, isRootMixin }) => {
            const stVarOverride = context.evaluator.stVarOverride || {};
            const mixDef = config.mixDef;
            const namedArgs = mixDef.data.options as Record<string, string>;

            if (mixDef.data.partial) {
                filterPartialMixinDecl(context.meta, mixinRoot, Object.keys(namedArgs));
            }

            // resolve override args
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
            collectOptionalArgs(
                { meta: resolved.meta, resolver: context.resolver },
                mixinRoot,
                optionalArgs
            );
            // transform mixin
            const mixinMeta: StylableMeta = resolved.meta;
            const symbolName =
                isRootMixin && resolved.meta !== context.meta ? 'default' : mixDef.data.type;
            config.transformer.transformAst(
                mixinRoot,
                mixinMeta,
                undefined,
                resolvedArgs,
                config.path.concat(symbolName + ' from ' + context.meta.source),
                true,
                config.transformer.createInferredSelector(mixinMeta, {
                    name: resolved.symbol.name,
                    type: resolved.symbol._kind,
                })
            );
            fixRelativeUrls(mixinRoot, resolved.meta.source, context.meta.source);
        }
    );

    for (const overrideArg of overrideKeys) {
        if (!optionalArgs.has(overrideArg)) {
            context.diagnostics.report(diagnostics.UNKNOWN_ARG(overrideArg), {
                node: mixDef.data.originDecl,
                word: overrideArg,
            });
        }
    }

    if (roots.length === 1) {
        mergeRules(
            roots[0],
            config.rule,
            mixDef.data.originDecl,
            config.transformer.diagnostics,
            false
        );
    } else if (roots.length > 1) {
        const mixinRoot = postcss.root();
        roots.forEach((root) => mixinRoot.prepend(...root.nodes));
        mergeRules(
            mixinRoot,
            config.rule,
            mixDef.data.originDecl,
            config.transformer.diagnostics,
            false
        );
    }
}

function collectOptionalArgs(
    context: Pick<FeatureTransformContext, 'meta' | 'resolver'>,
    mixinRoot: postcss.Root,
    optionalArgs: Set<string> = new Set()
) {
    mixinRoot.walk((node) => {
        const value = node.type === 'decl' ? node.value : node.type === 'atrule' ? node.params : '';
        const varNames = STVar.parseVarsFromExpr(value);
        for (const name of varNames) {
            for (const refName of STVar.resolveReferencedVarNames(context, name)) {
                optionalArgs.add(refName);
            }
        }
    });
}

function getCSSMixinRoots(
    contextMeta: StylableMeta,
    resolveChain: CSSResolve<ClassSymbol | ElementSymbol>[],
    processMixinRoot: (data: {
        mixinRoot: postcss.Root;
        resolved: CSSResolve<ClassSymbol | ElementSymbol>;
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
        processMixinRoot({ mixinRoot, resolved, isRootMixin });
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
