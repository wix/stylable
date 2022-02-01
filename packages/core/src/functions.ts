import { dirname, relative } from 'path';
import postcssValueParser from 'postcss-value-parser';
import type * as postcss from 'postcss';
import { resolveCustomValues } from './custom-values';
import { Diagnostics } from './diagnostics';
import { isCssNativeFunction } from './native-reserved-lists';
import { assureRelativeUrlPrefix } from './stylable-assets';
import type { StylableMeta } from './stylable-meta';
import type { CSSResolve, JSResolve, StylableResolver } from './stylable-resolver';
import type { replaceValueHook, StylableTransformer } from './stylable-transformer';
import { getFormatterArgs, getStringValue, stringifyFunction } from './helpers/value';
import type { ParsedValue } from './types';
import type { FeatureTransformContext } from './features/feature';
import { CSSCustomProperty, STSymbol, STVar } from './features';

export type ValueFormatter = (name: string) => string;
export type ResolvedFormatter = Record<string, JSResolve | CSSResolve | ValueFormatter | null>;

export interface EvalValueData {
    value: string;
    passedThrough: string[];
    node?: postcss.Node;
    valueHook?: replaceValueHook;
    meta: StylableMeta;
    tsVarOverride?: Record<string, string> | null;
    cssVarsMapping?: Record<string, string>;
    args?: string[];
}

export interface EvalValueResult {
    topLevelType: any;
    outputValue: string;
    typeError?: Error;
}

export class StylableEvaluator {
    public tsVarOverride: Record<string, string> | null | undefined;
    constructor(options: { tsVarOverride?: Record<string, string> | null }) {
        this.tsVarOverride = options.tsVarOverride;
    }
    evaluateValue(
        context: FeatureTransformContext,
        data: Omit<EvalValueData, 'passedThrough'> & { passedThrough?: string[] }
    ) {
        return processDeclarationValue(
            context.resolver,
            data.value,
            data.meta,
            data.node,
            data.tsVarOverride || this.tsVarOverride,
            data.valueHook,
            context.diagnostics,
            data.passedThrough,
            data.cssVarsMapping,
            data.args
        );
    }
}

// old API

export const functionWarnings = {
    FAIL_TO_EXECUTE_FORMATTER: (resolvedValue: string, message: string) =>
        `failed to execute formatter "${resolvedValue}" with error: "${message}"`,
    UNKNOWN_FORMATTER: (name: string) =>
        `cannot find native function or custom formatter called ${name}`,
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
            options[k],
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
    value: string,
    meta: StylableMeta,
    node?: postcss.Node,
    variableOverride?: Record<string, string> | null,
    valueHook?: replaceValueHook,
    diagnostics: Diagnostics = new Diagnostics(),
    passedThrough: string[] = [],
    cssVarsMapping: Record<string, string> = {},
    args: string[] = []
): EvalValueResult {
    const evaluator = new StylableEvaluator({ tsVarOverride: variableOverride });
    const customValues = resolveCustomValues(meta, resolver);
    const parsedValue: any = postcssValueParser(value);
    parsedValue.walk((parsedNode: ParsedValue) => {
        const { type, value } = parsedNode;
        switch (type) {
            case 'function':
                if (value === 'value') {
                    STVar.hooks.transformDeclarationValue({
                        context: {
                            meta,
                            diagnostics,
                            resolver,
                            evaluator,
                        },
                        data: {
                            value,
                            passedThrough,
                            node,
                            valueHook,
                            meta,
                            tsVarOverride: variableOverride,
                            cssVarsMapping,
                            args,
                        },
                        node: parsedNode,
                    });
                } else if (value === '') {
                    parsedNode.resolvedValue = stringifyFunction(value, parsedNode);
                } else if (customValues[value]) {
                    // no op resolved at the bottom
                } else if (value === 'url') {
                    // postcss-value-parser treats url differently:
                    // https://github.com/TrySound/postcss-value-parser/issues/34

                    const url = parsedNode.nodes[0];
                    if (
                        (url.type === 'word' || url.type === 'string') &&
                        url.value.startsWith('~')
                    ) {
                        const sourceDir = dirname(meta.source);
                        url.value = assureRelativeUrlPrefix(
                            relative(
                                sourceDir,
                                resolver.resolvePath(sourceDir, url.value.slice(1))
                            ).replace(/\\/gm, '/')
                        );
                    }
                } else if (value === 'format') {
                    // preserve native format function quotation
                    parsedNode.resolvedValue = stringifyFunction(value, parsedNode, true);
                } else {
                    const formatter = resolver.deepResolve(STSymbol.get(meta, value));
                    if (formatter && formatter._kind === 'js') {
                        const formatterArgs = getFormatterArgs(parsedNode);
                        try {
                            parsedNode.resolvedValue = formatter.symbol.apply(null, formatterArgs);
                            if (valueHook && typeof parsedNode.resolvedValue === 'string') {
                                parsedNode.resolvedValue = valueHook(
                                    parsedNode.resolvedValue,
                                    { name: parsedNode.value, args: formatterArgs },
                                    true,
                                    passedThrough
                                );
                            }
                        } catch (error) {
                            parsedNode.resolvedValue = stringifyFunction(value, parsedNode);
                            if (diagnostics && node) {
                                diagnostics.warn(
                                    node,
                                    functionWarnings.FAIL_TO_EXECUTE_FORMATTER(
                                        parsedNode.resolvedValue,
                                        (error as Error)?.message
                                    ),
                                    { word: (node as postcss.Declaration).value }
                                );
                            }
                        }
                    } else if (value === 'var') {
                        CSSCustomProperty.hooks.transformDeclarationValue({
                            context: {
                                meta,
                                diagnostics,
                                resolver,
                                evaluator,
                            },
                            data: {
                                value,
                                passedThrough,
                                node,
                                valueHook,
                                meta,
                                tsVarOverride: variableOverride,
                                cssVarsMapping,
                                args,
                            },
                            node: parsedNode,
                        });
                    } else if (isCssNativeFunction(value)) {
                        parsedNode.resolvedValue = stringifyFunction(value, parsedNode);
                    } else if (diagnostics && node) {
                        parsedNode.resolvedValue = stringifyFunction(value, parsedNode);
                        diagnostics.warn(node, functionWarnings.UNKNOWN_FORMATTER(value), {
                            word: value,
                        });
                    }
                }
                break;
            default: {
                return postcssValueParser.stringify(parsedNode as postcssValueParser.Node);
            }
        }
        return;
    }, true);

    let outputValue = '';
    let topLevelType = null;
    let typeError: Error | undefined = undefined;
    for (const n of parsedValue.nodes) {
        if (n.type === 'function') {
            const matchingType = customValues[n.value];

            if (matchingType) {
                topLevelType = matchingType.evalVarAst(n, customValues);
                try {
                    outputValue += matchingType.getValue(args, topLevelType, n, customValues);
                } catch (e) {
                    typeError = e as Error;
                    // catch broken variable resolutions
                }
            } else {
                outputValue += getStringValue([n]);
            }
        } else {
            outputValue += getStringValue([n]);
        }
    }
    return { outputValue, topLevelType, typeError };
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
    args: string[] = []
): string {
    return processDeclarationValue(
        resolver,
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
