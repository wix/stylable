import { dirname, relative } from 'path';
import postcssValueParser from 'postcss-value-parser';
import * as postcss from 'postcss';
import { resolveCustomValues } from './custom-values';
import { Diagnostics } from './diagnostics';
import { isCssNativeFunction } from './native-reserved-lists';
import { assureRelativeUrlPrefix } from './stylable-assets';
import { StylableMeta } from './stylable-processor';
import { CSSResolve, JSResolve, StylableResolver } from './stylable-resolver';
import { replaceValueHook, StylableTransformer } from './stylable-transformer';
import { isCSSVarProp } from './stylable-utils';
import {
    getFormatterArgs,
    getStringValue,
    strategies,
    valueMapping,
} from './stylable-value-parsers';
import { ParsedValue } from './types';
import { stripQuotation } from './utils';

export type ValueFormatter = (name: string) => string;
export type ResolvedFormatter = Record<string, JSResolve | CSSResolve | ValueFormatter | null>;

export const functionWarnings = {
    FAIL_TO_EXECUTE_FORMATTER: (resolvedValue: string, message: string) =>
        `failed to execute formatter "${resolvedValue}" with error: "${message}"`,
    CYCLIC_VALUE: (cyclicChain: string[]) =>
        `Cyclic value definition detected: "${cyclicChain
            .map((s, i) => (i === cyclicChain.length - 1 ? '↻ ' : i === 0 ? '→ ' : '↪ ') + s)
            .join('\n')}"`,
    CANNOT_USE_AS_VALUE: (type: string, varName: string) =>
        `${type} "${varName}" cannot be used as a variable`,
    CANNOT_USE_JS_AS_VALUE: (varName: string) =>
        `JavaScript import "${varName}" cannot be used as a variable`,
    CANNOT_FIND_IMPORTED_VAR: (varName: string) => `cannot use unknown imported "${varName}"`,
    MULTI_ARGS_IN_VALUE: (args: string) =>
        `value function accepts only a single argument: "value(${args})"`,
    COULD_NOT_RESOLVE_VALUE: (args: string) =>
        `cannot resolve value function using the arguments provided: "${args}"`,
    UNKNOWN_FORMATTER: (name: string) =>
        `cannot find native function or custom formatter called ${name}`,
    UNKNOWN_VAR: (name: string) => `unknown var "${name}"`,
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
    diagnostics?: Diagnostics,
    passedThrough: string[] = [],
    cssVarsMapping?: Record<string, string>,
    args: string[] = []
): { topLevelType: any; outputValue: string; typeError: Error } {
    diagnostics = node ? diagnostics : undefined;
    const customValues = resolveCustomValues(meta, resolver);
    const parsedValue: any = postcssValueParser(value);
    parsedValue.walk((parsedNode: ParsedValue) => {
        const { type, value } = parsedNode;
        switch (type) {
            case 'function':
                if (value === 'value') {
                    const parsedArgs = strategies.args(parsedNode).map((x) => x.value);
                    if (parsedArgs.length >= 1) {
                        const varName = parsedArgs[0];
                        const getArgs = parsedArgs
                            .slice(1)
                            .map((arg) =>
                                evalDeclarationValue(
                                    resolver,
                                    arg,
                                    meta,
                                    node,
                                    variableOverride,
                                    valueHook,
                                    diagnostics,
                                    passedThrough.concat(createUniqID(meta.source, varName)),
                                    cssVarsMapping,
                                    undefined
                                )
                            );
                        if (variableOverride && variableOverride[varName]) {
                            return (parsedNode.resolvedValue = variableOverride[varName]);
                        }
                        const refUniqID = createUniqID(meta.source, varName);
                        if (passedThrough.includes(refUniqID)) {
                            // TODO: move diagnostic to original value usage instead of the end of the cyclic chain
                            return handleCyclicValues(
                                passedThrough,
                                refUniqID,
                                diagnostics,
                                node,
                                value,
                                parsedNode
                            );
                        }
                        const varSymbol = meta.mappedSymbols[varName];
                        if (varSymbol && varSymbol._kind === 'var') {
                            const resolved = processDeclarationValue(
                                resolver,
                                stripQuotation(varSymbol.text),
                                meta,
                                varSymbol.node,
                                variableOverride,
                                valueHook,
                                diagnostics,
                                passedThrough.concat(createUniqID(meta.source, varName)),
                                cssVarsMapping,
                                getArgs
                            );

                            const { outputValue, topLevelType, typeError } = resolved;

                            if (diagnostics && node) {
                                const argsAsString = parsedArgs.join(', ');
                                if (typeError) {
                                    diagnostics.warn(
                                        node,
                                        functionWarnings.COULD_NOT_RESOLVE_VALUE(argsAsString)
                                    );
                                } else if (!topLevelType && parsedArgs.length > 1) {
                                    diagnostics.warn(
                                        node,
                                        functionWarnings.MULTI_ARGS_IN_VALUE(argsAsString)
                                    );
                                }
                            }

                            parsedNode.resolvedValue = valueHook
                                ? valueHook(outputValue, varName, true, passedThrough)
                                : outputValue;
                        } else if (varSymbol && varSymbol._kind === 'import') {
                            const resolvedVar = resolver.deepResolve(varSymbol);
                            if (resolvedVar && resolvedVar.symbol) {
                                const resolvedVarSymbol = resolvedVar.symbol;
                                if (resolvedVar._kind === 'css') {
                                    if (resolvedVarSymbol._kind === 'var') {
                                        const resolvedValue = evalDeclarationValue(
                                            resolver,
                                            stripQuotation(resolvedVarSymbol.text),
                                            resolvedVar.meta,
                                            resolvedVarSymbol.node,
                                            variableOverride,
                                            valueHook,
                                            diagnostics,
                                            passedThrough.concat(
                                                createUniqID(meta.source, varName)
                                            ),
                                            cssVarsMapping,
                                            getArgs
                                        );
                                        parsedNode.resolvedValue = valueHook
                                            ? valueHook(
                                                  resolvedValue,
                                                  varName,
                                                  false,
                                                  passedThrough
                                              )
                                            : resolvedValue;
                                    } else {
                                        const errorKind =
                                            resolvedVarSymbol._kind === 'class' &&
                                            resolvedVarSymbol[valueMapping.root]
                                                ? 'stylesheet'
                                                : resolvedVarSymbol._kind;
                                        if (diagnostics && node) {
                                            diagnostics.warn(
                                                node,
                                                functionWarnings.CANNOT_USE_AS_VALUE(
                                                    errorKind,
                                                    varName
                                                ),
                                                { word: varName }
                                            );
                                        }
                                    }
                                } else if (
                                    resolvedVar._kind === 'js' &&
                                    typeof resolvedVar.symbol === 'string'
                                ) {
                                    parsedNode.resolvedValue = valueHook
                                        ? valueHook(
                                              resolvedVar.symbol,
                                              varName,
                                              false,
                                              passedThrough
                                          )
                                        : resolvedVar.symbol;
                                } else if (resolvedVar._kind === 'js' && diagnostics && node) {
                                    // ToDo: provide actual exported id (default/named as x)
                                    diagnostics.warn(
                                        node,
                                        functionWarnings.CANNOT_USE_JS_AS_VALUE(varName),
                                        {
                                            word: varName,
                                        }
                                    );
                                }
                            } else {
                                const namedDecl = varSymbol.import.rule.nodes.find((node) => {
                                    return node.type === 'decl' && node.prop === valueMapping.named;
                                });
                                if (namedDecl && diagnostics && node) {
                                    // ToDo: provide actual exported id (default/named as x)
                                    diagnostics.error(
                                        node,
                                        functionWarnings.CANNOT_FIND_IMPORTED_VAR(varName),
                                        { word: varName }
                                    );
                                }
                            }
                        } else if (diagnostics && node) {
                            diagnostics.warn(node, functionWarnings.UNKNOWN_VAR(varName), {
                                word: varName,
                            });
                        }
                    }
                } else if (value === '') {
                    parsedNode.resolvedValue = stringifyFunction(value, parsedNode);
                } else {
                    if (customValues[value]) {
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
                                    resolver.resolvePath(url.value.slice(1), sourceDir)
                                ).replace(/\\/gm, '/')
                            );
                        }
                    } else if (value === 'format') {
                        // preserve native format function quotation
                        parsedNode.resolvedValue = stringifyFunction(value, parsedNode, true);
                    } else {
                        const formatterRef = meta.mappedSymbols[value];
                        const formatter = resolver.deepResolve(formatterRef);
                        const formatterArgs = getFormatterArgs(parsedNode);
                        if (formatter && formatter._kind === 'js') {
                            try {
                                parsedNode.resolvedValue = formatter.symbol.apply(
                                    null,
                                    formatterArgs
                                );
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
                                            error.message
                                        ),
                                        { word: (node as postcss.Declaration).value }
                                    );
                                }
                            }
                        } else if (value === 'var') {
                            const varWithPrefix = parsedNode.nodes[0].value;
                            if (isCSSVarProp(varWithPrefix)) {
                                if (cssVarsMapping && cssVarsMapping[varWithPrefix]) {
                                    parsedNode.nodes[0].value = cssVarsMapping[varWithPrefix];
                                }
                            }
                            // handle default values
                            if (parsedNode.nodes.length > 2) {
                                parsedNode.resolvedValue = stringifyFunction(value, parsedNode);
                            }
                        } else if (isCssNativeFunction(value)) {
                            parsedNode.resolvedValue = stringifyFunction(value, parsedNode);
                        } else if (diagnostics && node) {
                            parsedNode.resolvedValue = stringifyFunction(value, parsedNode);
                            diagnostics.warn(node, functionWarnings.UNKNOWN_FORMATTER(value), {
                                word: value,
                            });
                        }
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
    let typeError = null;
    for (const n of parsedValue.nodes) {
        if (n.type === 'function') {
            const matchingType = customValues[n.value];

            if (matchingType) {
                topLevelType = matchingType.evalVarAst(n, customValues);
                try {
                    outputValue += matchingType.getValue(args, topLevelType, n, customValues);
                } catch (e) {
                    typeError = e;
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
    // }
    // TODO: handle calc (parse internals but maintain expression)
    // TODO: check this thing. native function that accent our function does not work
    // e.g: calc(getVarName())
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

function handleCyclicValues(
    passedThrough: string[],
    refUniqID: string,
    diagnostics: Diagnostics | undefined,
    node: postcss.Node | undefined,
    value: string,
    parsedNode: ParsedValue
) {
    const cyclicChain = passedThrough.map((variable) => variable || '');
    cyclicChain.push(refUniqID);
    if (diagnostics && node) {
        diagnostics.warn(node, functionWarnings.CYCLIC_VALUE(cyclicChain), {
            word: refUniqID,
        });
    }
    return stringifyFunction(value, parsedNode);
}

function stringifyFunction(name: string, parsedNode: ParsedValue, perserveQuotes = false) {
    return `${name}(${getFormatterArgs(parsedNode, false, undefined, perserveQuotes).join(', ')})`;
}

function createUniqID(source: string, varName: string) {
    return `${source}: ${varName}`;
}
