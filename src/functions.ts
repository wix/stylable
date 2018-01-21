import * as postcss from 'postcss';
import { Diagnostics } from './diagnostics';
import { isCssNativeFunction } from './native-reserved-lists';
import { StylableMeta } from './stylable-processor';
import { CSSResolve, JSResolve, StylableResolver } from './stylable-resolver';
import { replaceValueHook, StylableTransformer } from './stylable-transformer';
import { valueMapping } from './stylable-value-parsers';
import { Pojo } from './types';
import { stripQuotation } from './utils';
const valueParser = require('postcss-value-parser');

export type ValueFormatter = (name: string) => string;
export type ResolvedFormatter = Pojo<JSResolve | CSSResolve | ValueFormatter | null>;
export interface ParsedValue {
    type: string;
    value: string;
    nodes?: any;
    resolvedValue?: string;
}

/* tslint:disable:max-line-length */
const errors = {
    FAIL_TO_EXECUTE_FORMATTER: (resolvedValue: string, message: string) => `failed to execute formatter "${resolvedValue}" with error: "${message}"`,
    CYCLIC_VALUE: (cyclicChain: string[]) => `Cyclic value definition detected: "${cyclicChain.map((s, i) => (i === cyclicChain.length - 1 ? '↻ ' : i === 0 ? '→ ' : '↪ ') + s).join('\n')}"`,
    CANNOT_USE_AS_VALUE: (type: string, varName: string) => `${type} "${varName}" cannot be used as a variable`,
    CANNOT_USE_JS_AS_VALUE: (varName: string) => `JavaScript import "${varName}" cannot be used as a variable`,
    CANNOT_FIND_IMPORTED_VAR: (varName: string, path: string) => `cannot find export '${varName}' in '${path}'`,
    MULTI_ARGS_IN_VALUE: (args: string) => `value function accepts only a single argument: "value(${args})"`,
    UNKNOWN_FORMATTER: (name: string) => `cannot find formatter: ${name}`,
    UNKNOWN_VAR: (name: string) => `unknown var "${name}"`
};
/* tslint:enable:max-line-length */

export function resolveArgumentsValue(
    options: Pojo<string>,
    transformer: StylableTransformer,
    meta: StylableMeta,
    variableOverride?: Pojo<string>,
    path?: string[]) {

    const resolvedArgs = {} as Pojo<string>;
    for (const k in options) {
        resolvedArgs[k] = evalDeclarationValue(
            transformer.resolver,
            options[k],
            meta,
            postcss.decl(),
            variableOverride,
            transformer.replaceValueHook,
            undefined,
            path
        );
    }
    return resolvedArgs;
}

export function evalDeclarationValue(
    resolver: StylableResolver,
    value: string,
    meta: StylableMeta,
    node: postcss.Node,
    variableOverride?: Pojo<string> | null,
    valueHook?: replaceValueHook,
    diagnostics?: Diagnostics,
    passedThrough: string[] = []) {
    const parsedValue = valueParser(value);
    if ((node as postcss.Declaration).prop === valueMapping.mixin) {
        return (node as postcss.Declaration).value;
    }
    parsedValue.walk((parsedNode: ParsedValue) => {
        const { type, value } = parsedNode;
        switch (type) {
            case 'function':
                if (value === 'value') {
                    const args = parsedNode.nodes.map((n: ParsedValue) => valueParser.stringify(n));
                    if (args.length === 1) {
                        const varName = args[0];
                        if (variableOverride && variableOverride[varName]) {
                            return parsedNode.resolvedValue = variableOverride[varName];
                        }
                        const refUniqID = createUniqID(meta.source, varName);
                        if (passedThrough.indexOf(refUniqID) !== -1) {
                            // TODO: move diagnostic to original value usage instead of the end of the cyclic chain
                            const cyclicChain = passedThrough.map(variable => variable || '');
                            cyclicChain.push(refUniqID);
                            if (diagnostics) {
                                diagnostics.warn(node,
                                    errors.CYCLIC_VALUE(cyclicChain),
                                    { word: refUniqID });
                            }
                            return stringifyFunction(value, parsedNode);
                        }
                        const varSymbol = meta.mappedSymbols[varName];

                        if (varSymbol && varSymbol._kind === 'var') {
                            const resolvedValue = evalDeclarationValue(
                                resolver,
                                stripQuotation(varSymbol.text),
                                meta,
                                varSymbol.node,
                                variableOverride,
                                valueHook,
                                diagnostics,
                                passedThrough.concat(createUniqID(meta.source, varName))
                            );

                            parsedNode.resolvedValue = valueHook ?
                                valueHook(resolvedValue, varName, true, passedThrough) :
                                resolvedValue;
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
                                            passedThrough.concat(createUniqID(meta.source, varName))
                                        );
                                        parsedNode.resolvedValue = valueHook ?
                                            valueHook(resolvedValue, varName, false, passedThrough) :
                                            resolvedValue;
                                    } else {
                                        const errorKind =
                                            (
                                                resolvedVarSymbol._kind === 'class'
                                                &&
                                                resolvedVarSymbol[valueMapping.root]
                                            ) ?
                                                'stylesheet' : resolvedVarSymbol._kind;

                                        if (diagnostics) {
                                            diagnostics.warn(node,
                                                errors.CANNOT_USE_AS_VALUE(errorKind, varName),
                                                { word: varName });
                                        }
                                    }
                                } else if (resolvedVar._kind === 'js' && diagnostics) {
                                    // ToDo: provide actual exported id (default/named as x)
                                    diagnostics.warn(node,
                                        errors.CANNOT_USE_JS_AS_VALUE(varName),
                                        { word: varName });
                                }
                            } else {
                                // TODO: move this to a seperate mechanism to check imports unrelated to usage
                                const namedDecl = varSymbol.import.rule.nodes!.find(node => {
                                    return node.type === 'decl' && node.prop === valueMapping.named;
                                });
                                if (namedDecl && diagnostics) {
                                    // ToDo: provide actual exported id (default/named as x)
                                    diagnostics.error(namedDecl,
                                        errors.CANNOT_FIND_IMPORTED_VAR(varName, varSymbol.import.fromRelative),
                                        { word: varName });
                                }
                            }
                        } else if (diagnostics) {
                            diagnostics.warn(node, errors.UNKNOWN_VAR(varName), { word: varName });
                        }
                    } else if (diagnostics) {
                        const argsAsString = args.filter((arg: string) => arg !== ', ').join(', ');
                        diagnostics.warn(
                            node,
                            errors.MULTI_ARGS_IN_VALUE(argsAsString),
                            { word: argsAsString });
                    }
                } else if (value === 'url') {
                    // postcss-value-parser treats url differently:
                    // https://github.com/TrySound/postcss-value-parser/issues/34
                } else {
                    const formatterRef = meta.mappedSymbols[value];
                    const formatter = resolver.deepResolve(formatterRef);
                    const args = getFormatterArgs(parsedNode);

                    if (formatter && formatter._kind === 'js') {
                        // TODO: Add try/catch, pipe error
                        try {
                            parsedNode.resolvedValue = formatter.symbol.apply(null, args);
                        } catch (error) {
                            // todo: issue diagnostic
                            parsedNode.resolvedValue = stringifyFunction(value, parsedNode);
                            if (diagnostics) {
                                diagnostics.warn(
                                    node,
                                    errors.FAIL_TO_EXECUTE_FORMATTER(parsedNode.resolvedValue, error.message),
                                    { word: (node as postcss.Declaration).value });
                            }
                        }
                    } else if (isCssNativeFunction(value)) {
                        parsedNode.resolvedValue = stringifyFunction(value, parsedNode);
                    } else if (diagnostics) {
                        diagnostics.warn(node, errors.UNKNOWN_FORMATTER(value), { word: value });
                    }
                }
                break;
            default: {
                return valueParser.stringify(parsedNode);
            }
        }

    }, true);

    // TODO: handle calc (parse internals but maintain expression)
    // TODO: check this thing. native function that accent our function dose not work
    // e.g: calc(getVarName())
    return valueParser.stringify(parsedValue.nodes, (node: ParsedValue) => {
        if (node.resolvedValue) {
            return node.resolvedValue;
        } else {
            // TODO: warn
            return undefined;
        }
    });
}

function getFormatterArgs(node: ParsedValue) {
    // TODO: revisit arguments split!!! e.g: , ro SPACE
    const argsResult = [];
    let currentArg = '';
    for (const currentNode of node.nodes) {
        if (currentNode.type === 'div' && currentNode.value === ',') {
            argsResult.push(currentArg.trim());
            currentArg = '';
        } else if (currentNode.type !== 'comment') {
            currentArg += (currentNode.resolvedValue || valueParser.stringify(currentNode));
        }
    }

    if (currentArg) {
        argsResult.push(currentArg.trim());
    }
    return argsResult;
}

function stringifyFunction(name: string, parsedNode: ParsedValue) {
    return `${name}(${getFormatterArgs(parsedNode).join(', ')})`;
}

function createUniqID(source: string, varName: string) {
    return `${source}: ${varName}`;
}
