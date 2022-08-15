import cloneDeepWith from 'lodash.clonedeepwith';
import postcssValueParser from 'postcss-value-parser';
import { getFormatterArgs, getNamedArgs, getStringValue } from './helpers/value';
import type { ParsedValue } from './types';

export class CustomValueError extends Error {
    constructor(message: string, public fallbackValue: string) {
        super(message);
    }
}

export interface Box<Type extends string, Value> {
    type: Type;
    value: Value;
    flatValue: string | undefined;
}

export function box<Type extends string, Value>(
    type: Type,
    value: Value,
    flatValue?: string
): Box<Type, Value> {
    return {
        type,
        value,
        flatValue,
    };
}

export function boxString(value: string) {
    return box('st-string', value, value);
}

export function unbox<B extends Box<string, unknown>>(
    boxed: B | string,
    unboxPrimitives = true,
    customValues?: CustomTypes,
    node?: ParsedValue
): any {
    if (typeof boxed === 'string') {
        return unboxPrimitives ? boxed : boxString(boxed);
    } else if (typeof boxed === 'object' && boxed) {
        const customValue = customValues?.[boxed.type];
        let value = boxed.value;
        if (customValue?.flattenValue && node) {
            value = customValue.getValue([], boxed, node, customValues!);
        }
        return cloneDeepWith(value, (v) => unbox(v, unboxPrimitives, customValues, node));
    }
}

export interface BoxedValueMap {
    [k: string]: string | Box<string, unknown>;
}

export type BoxedValueArray = Array<string | Box<string, unknown>>;

type CustomTypes = Record<string, CustomValueExtension<any>>;

export interface CustomValueExtension<T> {
    flattenValue?: FlattenValue<T>;
    evalVarAst(
        valueAst: ParsedValue,
        customTypes: {
            [typeID: string]: CustomValueExtension<unknown>;
        },
        boxPrimitive?: boolean
    ): Box<string, T>;
    getValue(
        path: string[],
        value: Box<string, T>,
        node: ParsedValue,
        customTypes: CustomTypes
    ): string;
}

function createStArrayCustomFunction() {
    return createCustomValue<BoxedValueArray, BoxedValueArray>({
        processArgs: (node, customTypes, boxPrimitive) => {
            return CustomValueStrategy.args(node, customTypes, boxPrimitive);
        },
        createValue: (args) => {
            return args;
        },
        getValue: (value, index) => value[parseInt(index, 10)],
    });
}

function createStMapCustomFunction() {
    return createCustomValue<BoxedValueMap, BoxedValueMap>({
        processArgs: (node, customTypes, boxPrimitive) => {
            return CustomValueStrategy.named(node, customTypes, boxPrimitive);
        },
        createValue: (args) => {
            return args;
        },
        getValue: (value, index) => value[index],
    });
}

export const stTypes: CustomTypes = {
    /** @deprecated - use `st-array` */
    stArray: createStArrayCustomFunction().register('stArray'),
    /** @deprecated - use `st-map` */
    stMap: createStMapCustomFunction().register('stMap'),
    'st-array': createStArrayCustomFunction().register('st-array'),
    'st-map': createStMapCustomFunction().register('st-map'),
    'st-string': createStMapCustomFunction().register('st-string'),
} as const;

export const deprecatedStFunctions: Record<string, { alternativeName: string }> = {
    stArray: {
        alternativeName: 'st-array',
    },
    stMap: {
        alternativeName: 'st-map',
    },
};

export const CustomValueStrategy = {
    args: (fnNode: ParsedValue, customTypes: CustomTypes, boxPrimitive?: boolean) => {
        const pathArgs = getFormatterArgs(fnNode);
        const outputArray = [];
        for (const arg of pathArgs) {
            const parsedArg = postcssValueParser(arg).nodes[0];
            const ct = parsedArg.type === 'function' && parsedArg.value;
            const resolvedValue =
                typeof ct === 'string' && customTypes[ct]
                    ? customTypes[ct].evalVarAst(parsedArg, customTypes, boxPrimitive)
                    : unbox(arg, !boxPrimitive);
            outputArray.push(resolvedValue);
        }
        return outputArray;
    },
    named: (fnNode: ParsedValue, customTypes: CustomTypes, boxPrimitive?: boolean) => {
        const outputMap: BoxedValueMap = {};
        const s = getNamedArgs(fnNode);
        for (const [prop, space, ...valueNodes] of s) {
            if (space.type !== 'space') {
                // TODO: error catch
                throw new Error('Invalid argument');
            }
            let resolvedValue;
            if (valueNodes.length === 0) {
                // TODO: error
            } else {
                const nonComments = valueNodes.filter((node) => node.type !== 'comment');
                if (nonComments.length === 1) {
                    const valueNode = nonComments[0];
                    resolvedValue = valueNode.resolvedValue;

                    if (!resolvedValue) {
                        const ct = customTypes[valueNode.value];
                        if (valueNode.type === 'function' && ct) {
                            resolvedValue = ct.evalVarAst(valueNode, customTypes, boxPrimitive);
                        } else {
                            resolvedValue = unbox(getStringValue(valueNode), !boxPrimitive);
                        }
                    } else if (typeof resolvedValue === 'string') {
                        const parsedArg = postcssValueParser(resolvedValue).nodes[0];
                        const ct = parsedArg.type === 'function' && parsedArg.value;
                        resolvedValue =
                            typeof ct === 'string' && customTypes[ct]
                                ? customTypes[ct].evalVarAst(parsedArg, customTypes, boxPrimitive)
                                : unbox(resolvedValue, !boxPrimitive);
                    }
                } else {
                    resolvedValue = unbox(getStringValue(valueNodes), !boxPrimitive);
                }
            }

            if (resolvedValue) {
                outputMap[prop.value] = resolvedValue;
            }
        }
        return outputMap;
    },
};

export interface JSValueExtension<Value> {
    _kind: 'CustomValue';
    register(localTypeSymbol: string): CustomValueExtension<Value>;
}

type FlattenValue<Value> = (v: Box<string, Value>) => {
    parts: Array<string | Box<string, unknown>>;
    delimiter: ',' | ' ';
};

interface ExtensionApi<Value, Args> {
    processArgs: (fnNode: ParsedValue, customTypes: CustomTypes, boxPrimitive?: boolean) => Args;
    createValue: (args: Args) => Value;
    getValue: (v: Value, key: string) => string | Box<string, unknown>;
    flattenValue?: FlattenValue<Value>;
}

export function createCustomValue<Value, Args>({
    processArgs,
    createValue,
    flattenValue,
    getValue,
}: ExtensionApi<Value, Args>): JSValueExtension<Value> {
    return {
        _kind: 'CustomValue',
        register(localTypeSymbol: string) {
            return {
                flattenValue,
                evalVarAst(fnNode: ParsedValue, customTypes: CustomTypes, boxPrimitive?: boolean) {
                    const args = processArgs(fnNode, customTypes, boxPrimitive);
                    const value = createValue(args);
                    let flatValue: string | undefined;

                    if (flattenValue) {
                        flatValue = getFlatValue(
                            flattenValue,
                            box(localTypeSymbol, value),
                            fnNode,
                            customTypes
                        );
                    }

                    return box(localTypeSymbol, value, flatValue);
                },
                getValue(
                    path: string[],
                    obj: Box<string, Value>,
                    fallbackNode: ParsedValue, // TODO: add test
                    customTypes: CustomTypes
                ): string {
                    if (path.length === 0) {
                        if (flattenValue) {
                            return getFlatValue(flattenValue, obj, fallbackNode, customTypes);
                        } else {
                            const stringifiedValue = getStringValue([fallbackNode]);

                            throw new CustomValueError(
                                `/* Error trying to flat -> */${stringifiedValue}`,
                                stringifiedValue
                            );
                        }
                    }
                    const value = getValue(obj.value, path[0]);
                    return getBoxValue(path.slice(1), value, fallbackNode, customTypes);
                },
            };
        },
    };
}

function getFlatValue<Value>(
    flattenValue: FlattenValue<Value>,
    obj: Box<string, Value>,
    fallbackNode: ParsedValue,
    customTypes: CustomTypes
) {
    const { delimiter, parts } = flattenValue(obj);
    return parts.map((v) => getBoxValue([], v, fallbackNode, customTypes)).join(delimiter);
}

function getBoxValue(
    path: string[],
    value: string | Box<string, unknown>,
    node: ParsedValue,
    customTypes: CustomTypes
): string {
    if (typeof value === 'string' || value.type === 'st-string') {
        return unbox(value, true, customTypes);
    } else if (value && customTypes[value.type]) {
        return customTypes[value.type].getValue(path, value, node, customTypes);
    } else {
        throw new Error('Unknown Type ' + JSON.stringify(value));
        // return JSON.stringify(value);
    }
}

export function isCustomValue(symbol: any): symbol is JSValueExtension<unknown> {
    return symbol?._kind === 'CustomValue';
}
