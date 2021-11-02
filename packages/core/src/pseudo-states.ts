import type * as postcss from 'postcss';
import postcssValueParser from 'postcss-value-parser';
import type { Diagnostics } from './diagnostics';
import { evalDeclarationValue } from './functions';
import {
    parseSelectorWithCache,
    convertToClass,
    stringifySelector,
    convertToInvalid,
} from './helpers/selector';
import { wrapFunctionForDeprecation } from './helpers/deprecation';
import type { PseudoClass } from '@tokey/css-selector-parser';
import { StateResult, systemValidators } from './state-validators';
import type { StylableMeta } from './stylable-meta';
import type { StylableResolver } from './stylable-resolver';
import { groupValues, listOptions, MappedStates } from './stylable-value-parsers';
import { valueMapping } from './stylable-value-parsers';
import type { ParsedValue, StateParsedValue } from './types';
import { CSSClass } from './features';
import { stripQuotation } from './utils';
import { reservedPseudoClasses } from './native-reserved-lists';
import cssesc from 'cssesc';

export const stateMiddleDelimiter = '-';
export const booleanStateDelimiter = '--';
export const stateWithParamDelimiter = booleanStateDelimiter + stateMiddleDelimiter;

export const stateErrors = {
    UNKNOWN_STATE_USAGE: (name: string) => `unknown pseudo-state "${name}"`,
    UNKNOWN_STATE_TYPE: (name: string, type: string) =>
        `pseudo-state "${name}" defined with unknown type: "${type}"`,
    TOO_MANY_STATE_TYPES: (name: string, types: string[]) =>
        `pseudo-state "${name}(${types.join(', ')})" definition must be of a single type`,
    NO_STATE_ARGUMENT_GIVEN: (name: string, type: string) =>
        `pseudo-state "${name}" expected argument of type "${type}" but got none`,
    NO_STATE_TYPE_GIVEN: (name: string) =>
        `pseudo-state "${name}" expected a definition of a single type, but received none`,
    TOO_MANY_ARGS_IN_VALIDATOR: (name: string, validator: string, args: string[]) =>
        `pseudo-state "${name}" expected "${validator}" validator to receive a single argument, but it received "${args.join(
            ', '
        )}"`,
    STATE_STARTS_WITH_HYPHEN: (name: string) =>
        `state "${name}" declaration cannot begin with a "${stateMiddleDelimiter}" character`,
    RESERVED_NATIVE_STATE: (name: string) => `state "${name}" is reserved for native pseudo-class`,
};

// PROCESS

export function processPseudoStates(
    value: string,
    decl: postcss.Declaration,
    diagnostics: Diagnostics
) {
    const mappedStates: MappedStates = {};
    const ast = postcssValueParser(value);
    const statesSplitByComma = groupValues(ast.nodes);

    statesSplitByComma.forEach((workingState: ParsedValue[]) => {
        const [stateDefinition, ...stateDefault] = workingState;

        if (stateDefinition.value.startsWith('-')) {
            diagnostics.error(decl, stateErrors.STATE_STARTS_WITH_HYPHEN(stateDefinition.value), {
                word: stateDefinition.value,
            });
        } else if (reservedPseudoClasses.includes(stateDefinition.value)) {
            diagnostics.warn(decl, stateErrors.RESERVED_NATIVE_STATE(stateDefinition.value), {
                word: stateDefinition.value,
            });
            return;
        }

        if (stateDefinition.type === 'function') {
            resolveStateType(stateDefinition, mappedStates, stateDefault, diagnostics, decl);
        } else if (stateDefinition.type === 'word') {
            resolveBooleanState(mappedStates, stateDefinition);
        } else {
            // TODO: Invalid state, edge case needs warning
        }
    });

    return mappedStates;
}

function resolveStateType(
    stateDefinition: ParsedValue,
    mappedStates: MappedStates,
    stateDefault: ParsedValue[],
    diagnostics: Diagnostics,
    decl: postcss.Declaration
) {
    if (stateDefinition.type === 'function' && stateDefinition.nodes.length === 0) {
        resolveBooleanState(mappedStates, stateDefinition);

        diagnostics.warn(decl, stateErrors.NO_STATE_TYPE_GIVEN(stateDefinition.value), {
            word: decl.value,
        });

        return;
    }

    if (stateDefinition.nodes.length > 1) {
        diagnostics.warn(
            decl,
            stateErrors.TOO_MANY_STATE_TYPES(stateDefinition.value, listOptions(stateDefinition)),
            { word: decl.value }
        );
    }

    const paramType = stateDefinition.nodes[0];
    const stateType: StateParsedValue = {
        type: paramType.value,
        arguments: [],
        defaultValue: postcssValueParser
            .stringify(stateDefault as postcssValueParser.Node[])
            .trim(),
    };

    if (isCustomMapping(stateDefinition)) {
        mappedStates[stateDefinition.value] = stateType.type.trim().replace(/\\["']/g, '"');
    } else if (typeof stateType === 'object' && stateType.type === 'boolean') {
        resolveBooleanState(mappedStates, stateDefinition);
        return;
    } else if (paramType.type === 'function' && stateType.type in systemValidators) {
        if (paramType.nodes.length > 0) {
            resolveArguments(paramType, stateType, stateDefinition.value, diagnostics, decl);
        }
        mappedStates[stateDefinition.value] = stateType;
    } else if (stateType.type in systemValidators) {
        mappedStates[stateDefinition.value] = stateType;
    } else {
        diagnostics.warn(
            decl,
            stateErrors.UNKNOWN_STATE_TYPE(stateDefinition.value, paramType.value),
            { word: paramType.value }
        );
    }
}

function resolveArguments(
    paramType: ParsedValue,
    stateType: StateParsedValue,
    name: string,
    diagnostics: Diagnostics,
    decl: postcss.Declaration
) {
    const separatedByComma = groupValues(paramType.nodes);

    separatedByComma.forEach((group) => {
        const validator = group[0];
        if (validator.type === 'function') {
            const args = listOptions(validator);
            if (args.length > 1) {
                diagnostics.warn(
                    decl,
                    stateErrors.TOO_MANY_ARGS_IN_VALIDATOR(name, validator.value, args),
                    { word: decl.value }
                );
            } else {
                stateType.arguments.push({
                    name: validator.value,
                    args,
                });
            }
        } else if (validator.type === 'string' || validator.type === 'word') {
            stateType.arguments.push(validator.value);
        }
    });
}

function isCustomMapping(stateDefinition: ParsedValue) {
    return stateDefinition.nodes.length === 1 && stateDefinition.nodes[0].type === 'string';
}

function resolveBooleanState(mappedStates: MappedStates, stateDefinition: ParsedValue) {
    const currentState = mappedStates[stateDefinition.type];
    if (!currentState) {
        mappedStates[stateDefinition.value] = null; // add boolean state
    } else {
        // TODO: warn with such name already exists
    }
}

// TRANSFORM

/* @deprecated */
export const validateStateDefinition = wrapFunctionForDeprecation(
    function (
        decl: postcss.Declaration,
        meta: StylableMeta,
        resolver: StylableResolver,
        diagnostics: Diagnostics
    ) {
        if (decl.parent && decl.parent.type !== 'root') {
            const container = decl.parent;
            if (container.type !== 'atrule') {
                const parentRule = container as postcss.Rule;
                const selectorAst = parseSelectorWithCache(parentRule.selector);
                if (selectorAst.length && selectorAst.length === 1) {
                    const singleSelectorAst = selectorAst[0];
                    const selectorChunk = singleSelectorAst.nodes;

                    if (selectorChunk.length === 1 && selectorChunk[0].type === 'class') {
                        const className = selectorChunk[0].value;
                        const classMeta = CSSClass.getClass(meta, className)!;
                        const states = classMeta[valueMapping.states];

                        if (classMeta && classMeta._kind === 'class' && states) {
                            for (const stateName in states) {
                                // TODO: Sort out types
                                const state = states[stateName];
                                if (state && typeof state === 'object') {
                                    const res = validateStateArgument(
                                        state,
                                        meta,
                                        state.defaultValue || '',
                                        resolver,
                                        diagnostics,
                                        parentRule,
                                        true,
                                        !!state.defaultValue
                                    );

                                    if (res.errors) {
                                        res.errors.unshift(
                                            `pseudo-state "${stateName}" default value "${state.defaultValue}" failed validation:`
                                        );
                                        diagnostics.warn(decl, res.errors.join('\n'), {
                                            word: decl.value,
                                        });
                                    }
                                }
                            }
                        } else {
                            // TODO: error state on non-class
                        }
                    }
                }
            }
        }
    },
    { name: `validateStateDefinition` }
);

export function validateStateArgument(
    stateAst: StateParsedValue,
    meta: StylableMeta,
    value: string,
    resolver: StylableResolver,
    diagnostics: Diagnostics,
    rule?: postcss.Rule,
    validateDefinition?: boolean,
    validateValue = true
) {
    const resolvedValidations: StateResult = {
        res: resolveParam(meta, resolver, diagnostics, rule, value || stateAst.defaultValue),
        errors: null,
    };

    const { type: paramType } = stateAst;
    const validator = systemValidators[paramType];

    try {
        if (resolvedValidations.res || validateDefinition) {
            const { errors } = validator.validate(
                resolvedValidations.res,
                stateAst.arguments,
                resolveParam.bind(null, meta, resolver, diagnostics, rule),
                !!validateDefinition,
                validateValue
            );
            resolvedValidations.errors = errors;
        }
    } catch (error) {
        // TODO: warn about validation throwing exception
    }

    return resolvedValidations;
}

export function setStateToNode(
    states: MappedStates,
    meta: StylableMeta,
    name: string,
    node: PseudoClass,
    namespace: string,
    resolver: StylableResolver,
    diagnostics: Diagnostics,
    rule?: postcss.Rule
) {
    const stateDef = states[name];

    if (stateDef === null) {
        convertToClass(node).value = createBooleanStateClassName(name, namespace);
    } else if (typeof stateDef === 'string') {
        // simply concat global mapped selector - ToDo: maybe change to 'selector'
        convertToInvalid(node).value = stateDef;
    } else if (typeof stateDef === 'object') {
        resolveStateValue(meta, resolver, diagnostics, rule, node, stateDef, name, namespace);
    }
    delete node.nodes;
}

function resolveStateValue(
    meta: StylableMeta,
    resolver: StylableResolver,
    diagnostics: Diagnostics,
    rule: postcss.Rule | undefined,
    node: PseudoClass,
    stateDef: StateParsedValue,
    name: string,
    namespace: string
) {
    const inputValue = node.nodes && node.nodes.length ? stringifySelector(node.nodes) : ``;
    let actualParam = resolveParam(
        meta,
        resolver,
        diagnostics,
        rule,
        inputValue ? inputValue : stateDef.defaultValue
    );

    if (rule && !inputValue && !stateDef.defaultValue) {
        diagnostics.warn(rule, stateErrors.NO_STATE_ARGUMENT_GIVEN(name, stateDef.type), {
            word: name,
        });
    }

    const validator = systemValidators[stateDef.type];

    let stateParamOutput;
    try {
        stateParamOutput = validator.validate(
            actualParam,
            stateDef.arguments,
            resolveParam.bind(null, meta, resolver, diagnostics, rule),
            false,
            true
        );
    } catch (e) {
        // TODO: warn about validation throwing exception
    }

    if (stateParamOutput !== undefined) {
        if (stateParamOutput.res !== actualParam) {
            actualParam = stateParamOutput.res;
        }

        if (rule && stateParamOutput.errors) {
            stateParamOutput.errors.unshift(
                `pseudo-state "${name}" with parameter "${actualParam}" failed validation:`
            );

            diagnostics.warn(rule, stateParamOutput.errors.join('\n'), { word: actualParam });
        }
    }

    const strippedParam = stripQuotation(actualParam);
    convertToClass(node).value = createStateWithParamClassName(name, namespace, strippedParam);
}

function resolveParam(
    meta: StylableMeta,
    resolver: StylableResolver,
    diagnostics: Diagnostics,
    rule?: postcss.Rule,
    nodeContent?: string
) {
    const defaultStringValue = '';
    const param = nodeContent || defaultStringValue;
    return evalDeclarationValue(resolver, param, meta, rule, undefined, undefined, diagnostics);
}

export function createBooleanStateClassName(stateName: string, namespace: string) {
    const escapedNamespace = cssesc(namespace, { isIdentifier: true });
    return `${escapedNamespace}${booleanStateDelimiter}${stateName}`;
}

export function createStateWithParamClassName(stateName: string, namespace: string, param: string) {
    const escapedNamespace = cssesc(namespace, { isIdentifier: true });
    return `${escapedNamespace}${stateWithParamDelimiter}${stateName}${resolveStateParam(
        param,
        true
    )}`;
}

export function resolveStateParam(param: string, escape = false) {
    const result = `${stateMiddleDelimiter}${param.length}${stateMiddleDelimiter}${param.replace(
        /\s/gm,
        '_'
    )}`;
    // adding/removing initial `s` to indicate that it's not the first param of the identifier
    return escape ? cssesc(`s` + result, { isIdentifier: true }).slice(1) : result;
}
