import { dirname, relative } from 'path';
import postcssValueParser from 'postcss-value-parser';
import type * as postcss from 'postcss';
import { createDiagnosticReporter, Diagnostics } from './diagnostics';
import { nativeFunctionsDic } from './native-reserved-lists';
import { assureRelativeUrlPrefix } from './stylable-assets';
import type { StylableMeta } from './stylable-meta';
import {
    StylableResolver,
    createSymbolResolverWithCache,
    MetaResolvedSymbols,
} from './stylable-resolver';
import type { replaceValueHook, RuntimeStVar, StylableTransformer } from './stylable-transformer';
import { getFormatterArgs, getStringValue, stringifyFunction } from './helpers/value';
import { unescapeCSS } from './helpers/escape';
import type { ParsedValue } from './types';
import type { FeatureTransformContext } from './features/feature';
import { CSSCustomProperty, STVar } from './features';
import { unbox, CustomValueError } from './custom-values';

export interface EvalValueData {
    value: string;
    node?: postcss.Node;
    meta: StylableMeta;
    stVarOverride?: Record<string, string> | null;
    cssVarsMapping?: Record<string, string>;
    args?: string[];
    rootArgument?: string;
    initialNode?: postcss.Node;
}

export interface EvalValueResult {
    topLevelType: any;
    runtimeValue: RuntimeStVar;
    outputValue: string;
    typeError?: Error;
}

export class StylableEvaluator {
    public stVarOverride: Record<string, string> | null | undefined;
    public getResolvedSymbols: (meta: StylableMeta) => MetaResolvedSymbols;
    public valueHook?: replaceValueHook;
    constructor(options: {
        stVarOverride?: Record<string, string> | null;
        valueHook?: replaceValueHook;
        getResolvedSymbols: (meta: StylableMeta) => MetaResolvedSymbols;
    }) {
        this.valueHook = options.valueHook;
        this.stVarOverride = options.stVarOverride;
        this.getResolvedSymbols = options.getResolvedSymbols;
    }
    evaluateValue(
        context: Omit<FeatureTransformContext, 'getResolvedSymbols'>,
        data: Omit<EvalValueData, 'passedThrough' | 'valueHook'>
    ) {
        return processDeclarationValue(
            context.resolver,
            this.getResolvedSymbols,
            data.value,
            data.meta,
            data.node,
            data.stVarOverride || this.stVarOverride,
            this.valueHook,
            context.diagnostics,
            context.passedThrough,
            data.cssVarsMapping,
            data.args,
            data.rootArgument,
            data.initialNode
        );
    }
}

// old API

export const functionDiagnostics = {
    FAIL_TO_EXECUTE_FORMATTER: createDiagnosticReporter(
        '15001',
        'error',
        (resolvedValue: string, message: string) =>
            `failed to execute formatter "${resolvedValue}" with error: "${message}"`
    ),
    UNKNOWN_FORMATTER: createDiagnosticReporter(
        '15002',
        'error',
        (name: string) => `cannot find native function or custom formatter called ${name}`
    ),
};

export function resolveArgumentsValue(
    options: Record<string, string>,
    transformer: StylableTransformer,
    meta: StylableMeta,
    diagnostics: Diagnostics,
    node: postcss.Node,
    variableOverride?: Record<string, string>,
    path?: string[],
    cssVarsMapping?: Record<string, string>
) {
    const resolvedArgs = {} as Record<string, string>;
    for (const k in options) {
        resolvedArgs[k] = evalDeclarationValue(
            transformer.resolver,
            unescapeCSS(options[k]),
            meta,
            node,
            variableOverride,
            transformer.replaceValueHook,
            diagnostics,
            path,
            cssVarsMapping,
            undefined
        );
    }
    return resolvedArgs;
}

export function processDeclarationValue(
    resolver: StylableResolver,
    getResolvedSymbols: (meta: StylableMeta) => MetaResolvedSymbols,
    value: string,
    meta: StylableMeta,
    node?: postcss.Node,
    variableOverride?: Record<string, string> | null,
    valueHook?: replaceValueHook,
    diagnostics: Diagnostics = new Diagnostics(),
    passedThrough: string[] = [],
    cssVarsMapping: Record<string, string> = {},
    args: string[] = [],
    rootArgument?: string,
    initialNode?: postcss.Node
): EvalValueResult {
    const evaluator = new StylableEvaluator({
        stVarOverride: variableOverride,
        valueHook,
        getResolvedSymbols,
    });
    const resolvedSymbols = getResolvedSymbols(meta);
    const parsedValue: any = postcssValueParser(value);
    parsedValue.walk((parsedNode: ParsedValue) => {
        const { type, value } = parsedNode;
        if (type === `function`) {
            if (value === 'value') {
                STVar.hooks.transformValue({
                    context: {
                        meta,
                        diagnostics,
                        resolver,
                        evaluator,
                        getResolvedSymbols,
                        passedThrough,
                    },
                    data: {
                        value,
                        node,
                        meta,
                        stVarOverride: variableOverride,
                        cssVarsMapping,
                        args,
                        rootArgument,
                        initialNode,
                    },
                    node: parsedNode,
                });
            } else if (value === '') {
                parsedNode.resolvedValue = stringifyFunction(value, parsedNode);
            } else if (resolvedSymbols.customValues[value]) {
                // no op resolved at the bottom
            } else if (value === 'url') {
                // postcss-value-parser treats url differently:
                // https://github.com/TrySound/postcss-value-parser/issues/34
                const url = parsedNode.nodes[0];
                if ((url.type === 'word' || url.type === 'string') && url.value.startsWith('~')) {
                    const sourceDir = dirname(meta.source);
                    url.value = assureRelativeUrlPrefix(
                        relative(
                            sourceDir,
                            resolver.resolvePath(sourceDir, url.value.slice(1))
                        ).replace(/\\/gm, '/')
                    );
                }
            } else if (value === 'format') {
                // preserve native format function arg quotation
                parsedNode.resolvedValue = stringifyFunction(value, parsedNode, true);
            } else if (resolvedSymbols.js[value]) {
                const formatter = resolvedSymbols.js[value];
                const formatterArgs = getFormatterArgs(parsedNode);
                try {
                    parsedNode.resolvedValue = formatter.symbol.apply(null, formatterArgs);
                    if (evaluator.valueHook && typeof parsedNode.resolvedValue === 'string') {
                        parsedNode.resolvedValue = evaluator.valueHook(
                            parsedNode.resolvedValue,
                            { name: parsedNode.value, args: formatterArgs },
                            true,
                            passedThrough
                        );
                    }
                } catch (error) {
                    parsedNode.resolvedValue = stringifyFunction(value, parsedNode);
                    if (diagnostics && node) {
                        diagnostics.report(
                            functionDiagnostics.FAIL_TO_EXECUTE_FORMATTER(
                                parsedNode.resolvedValue,
                                (error as Error)?.message
                            ),
                            {
                                node,
                                word: (node as postcss.Declaration).value,
                            }
                        );
                    }
                }
            } else if (value === 'var') {
                CSSCustomProperty.hooks.transformValue({
                    context: {
                        meta,
                        diagnostics,
                        resolver,
                        evaluator,
                        getResolvedSymbols,
                        passedThrough,
                    },
                    data: {
                        value,
                        node,
                        meta,
                        stVarOverride: variableOverride,
                        cssVarsMapping,
                        args,
                        rootArgument,
                        initialNode,
                    },
                    node: parsedNode,
                });
            } else if (nativeFunctionsDic[value]) {
                const { preserveQuotes } = nativeFunctionsDic[value];
                parsedNode.resolvedValue = stringifyFunction(value, parsedNode, preserveQuotes);
            } else if (node) {
                parsedNode.resolvedValue = stringifyFunction(value, parsedNode);
                diagnostics.report(functionDiagnostics.UNKNOWN_FORMATTER(value), {
                    node,
                    word: value,
                });
            }
        }
    }, true);

    let outputValue = '';
    let topLevelType = null;
    let runtimeValue = null;
    let typeError: Error | undefined = undefined;
    for (const n of parsedValue.nodes) {
        if (n.type === 'function') {
            const matchingType = resolvedSymbols.customValues[n.value];

            if (matchingType) {
                try {
                    topLevelType = matchingType.evalVarAst(n, resolvedSymbols.customValues, true);
                    runtimeValue = unbox(topLevelType, true, resolvedSymbols.customValues, n);
                    try {
                        outputValue += matchingType.getValue(
                            args,
                            topLevelType,
                            n,
                            resolvedSymbols.customValues
                        );
                    } catch (error) {
                        if (error instanceof CustomValueError) {
                            outputValue += error.fallbackValue;
                        } else {
                            throw error;
                        }
                    }
                } catch (e) {
                    typeError = e as Error;

                    const invalidNode = initialNode || node;

                    if (invalidNode) {
                        diagnostics.report(
                            STVar.diagnostics.COULD_NOT_RESOLVE_VALUE(
                                [...(rootArgument ? [rootArgument] : []), ...args].join(', ')
                            ),
                            {
                                node: invalidNode,
                                word: value,
                            }
                        );
                    } else {
                        // TODO: catch broken variable resolutions without a node
                    }
                }
            } else {
                outputValue += getStringValue([n]);
            }
        } else {
            outputValue += getStringValue([n]);
        }
    }
    return { outputValue, topLevelType, typeError, runtimeValue };
}

export function evalDeclarationValue(
    resolver: StylableResolver,
    value: string,
    meta: StylableMeta,
    node?: postcss.Node,
    variableOverride?: Record<string, string> | null,
    valueHook?: replaceValueHook,
    diagnostics?: Diagnostics,
    passedThrough: string[] = [],
    cssVarsMapping?: Record<string, string>,
    args: string[] = [],
    getResolvedSymbols: (meta: StylableMeta) => MetaResolvedSymbols = createSymbolResolverWithCache(
        resolver,
        diagnostics || new Diagnostics()
    )
): string {
    return processDeclarationValue(
        resolver,
        getResolvedSymbols,
        value,
        meta,
        node,
        variableOverride,
        valueHook,
        diagnostics,
        passedThrough,
        cssVarsMapping,
        args
    ).outputValue;
}
