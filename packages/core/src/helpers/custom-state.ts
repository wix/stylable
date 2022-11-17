import type * as postcss from 'postcss';
import postcssValueParser, {
    type Node as ValueNode,
    type FunctionNode,
} from 'postcss-value-parser';
import cssesc from 'cssesc';
import type { PseudoClass } from '@tokey/css-selector-parser';
import { createDiagnosticReporter, Diagnostics } from '../diagnostics';
import {
    parseSelectorWithCache,
    stringifySelector,
    convertToClass,
    convertToInvalid,
} from './selector';
import { groupValues, listOptions } from './value';
import { stripQuotation } from './string';
import { evalDeclarationValue } from '../functions';
import type { StylableMeta } from '../stylable-meta';
import type { StylableResolver } from '../stylable-resolver';
import type { ParsedValue } from '../types';
import { CSSClass } from '../features';
import { reservedFunctionalPseudoClasses } from '../native-reserved-lists';

export interface MappedStates {
    [s: string]: StateParsedValue | string | null;
}
export interface StateParsedValue {
    type: string;
    defaultValue?: string;
    arguments: StateArguments;
    template: string;
}
export interface StateTypeValidator {
    name: string;
    args: string[];
}

type StateArguments = Array<StateTypeValidator | string>;

export const stateMiddleDelimiter = '-';
export const booleanStateDelimiter = '--';
export const stateWithParamDelimiter = booleanStateDelimiter + stateMiddleDelimiter;

export const stateDiagnostics = {
    MISSING_TYPE_OR_TEMPLATE: createDiagnosticReporter(
        '08013',
        'error',
        (name: string) => `pseudo-state "${name}" missing type or template`
    ),
    UNKNOWN_STATE_TYPE: createDiagnosticReporter(
        '08002',
        'error',
        (name: string, type: string) =>
            `pseudo-state "${name}" defined with unknown type: "${type}"`
    ),
    TOO_MANY_STATE_TYPES: createDiagnosticReporter(
        '08003',
        'error',
        (name: string, types: string[]) =>
            `pseudo-state "${name}(${types.join(', ')})" definition must be of a single type`
    ),
    NO_STATE_TYPE_GIVEN: createDiagnosticReporter(
        '08005',
        'warning',
        (name: string) =>
            `pseudo-state "${name}" expected a definition of a single type, but received none`
    ),
    TOO_MANY_ARGS_IN_VALIDATOR: createDiagnosticReporter(
        '08006',
        'error',
        (name: string, validator: string, args: string[]) =>
            `pseudo-state "${name}" expected "${validator}" validator to receive a single argument, but it received "${args.join(
                ', '
            )}"`
    ),
    STATE_STARTS_WITH_HYPHEN: createDiagnosticReporter(
        '08007',
        'error',
        (name: string) =>
            `state "${name}" declaration cannot begin with a "${stateMiddleDelimiter}" character`
    ),
    RESERVED_NATIVE_STATE: createDiagnosticReporter(
        '08008',
        'warning',
        (name: string) => `state "${name}" is reserved for native pseudo-class`
    ),
    DEFAULT_PARAM_FAILS_VALIDATION: createDiagnosticReporter(
        '08010',
        'error',
        (stateName: string, defaultValue: string, errors: string[]) =>
            `pseudo-state "${stateName}" default value "${defaultValue}" failed validation:\n${errors.join(
                '\n'
            )}`
    ),
    NO_STATE_ARGUMENT_GIVEN: createDiagnosticReporter(
        '08004',
        'error',
        (name: string, type: string) =>
            `pseudo-state "${name}" expected argument of type "${type}" but got none`
    ),
    FAILED_STATE_VALIDATION: createDiagnosticReporter(
        '08009',
        'error',
        (name: string, actualParam: string, errors: string[]) =>
            [
                `pseudo-state "${name}" with parameter "${actualParam}" failed validation:`,
                ...errors,
            ].join('\n')
    ),
    TEMPLATE_MISSING_PLACEHOLDER: createDiagnosticReporter(
        '08011',
        'warning',
        (state: string, template: string) =>
            `pseudo-state "${state}" template "${template}" is missing a placeholder, use "$0" to set the parameter insertion place`
    ),
    TEMPLATE_UNSUPPORTED_PLACEHOLDER: createDiagnosticReporter(
        '08012',
        'warning',
        (state: string, template: string, placeholders: string[]) =>
            `pseudo-state "${state}" template "${template}" contains unsupported placeholders (${placeholders.join(
                ', '
            )}), only a single parameter is currently supported`
    ),
    TEMPLATE_UNEXPECTED_ARGS: createDiagnosticReporter(
        '08014',
        'error',
        (state: string) =>
            `pseudo-state "${state}" template defined expect only a single string value`
    ),
};

// parse

export function parsePseudoStates(
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
            diagnostics.report(stateDiagnostics.STATE_STARTS_WITH_HYPHEN(stateDefinition.value), {
                node: decl,
                word: stateDefinition.value,
            });
        } else if (reservedFunctionalPseudoClasses.includes(stateDefinition.value)) {
            diagnostics.report(stateDiagnostics.RESERVED_NATIVE_STATE(stateDefinition.value), {
                node: decl,
                word: stateDefinition.value,
            });
            return;
        }

        if (stateDefinition.type === 'function') {
            resolveStateType(
                stateDefinition as FunctionNode,
                mappedStates,
                stateDefault,
                diagnostics,
                decl
            );
        } else if (stateDefinition.type === 'word') {
            resolveBooleanState(mappedStates, stateDefinition);
        } else {
            // TODO: Invalid state, edge case needs warning
        }
    });

    return mappedStates;
}
function resolveBooleanState(mappedStates: MappedStates, stateDefinition: ParsedValue) {
    const currentState = mappedStates[stateDefinition.type];
    if (!currentState) {
        mappedStates[stateDefinition.value] = null; // add boolean state
    } else {
        // TODO: warn with such name already exists
    }
}
function resolveStateType(
    stateDefinition: FunctionNode,
    mappedStates: MappedStates,
    stateDefault: ParsedValue[],
    diagnostics: Diagnostics,
    decl: postcss.Declaration
) {
    const stateName = stateDefinition.value;
    if (stateDefinition.nodes.length === 0) {
        resolveBooleanState(mappedStates, stateDefinition);

        diagnostics.report(stateDiagnostics.NO_STATE_TYPE_GIVEN(stateName), {
            node: decl,
            word: decl.value,
        });

        return;
    }
    const { paramType, template, argsFirstNode, argsFullValue } = collectStateArgsDef(
        stateDefinition.nodes,
        stateName,
        decl,
        diagnostics
    );

    if (argsFullValue.length > 2 || (argsFirstNode[1] && argsFirstNode[1].type !== 'string')) {
        diagnostics.report(
            stateDiagnostics.TOO_MANY_STATE_TYPES(
                stateName,
                argsFirstNode.map((argNode) =>
                    argNode ? postcssValueParser.stringify(argNode) : ''
                )
            ),
            {
                node: decl,
                word: decl.value,
            }
        );
    }

    if (!paramType) {
        return;
    }

    const stateType: StateParsedValue = {
        type: paramType.value,
        arguments: [],
        defaultValue: postcssValueParser
            .stringify(stateDefault as postcssValueParser.Node[])
            .trim(),
        template,
    };

    if (paramType.type === 'string') {
        // template
        mappedStates[stateName] = stateType.type.trim().replace(/\\["']/g, '"');
        if (argsFullValue.length > 1) {
            diagnostics.report(stateDiagnostics.TEMPLATE_UNEXPECTED_ARGS(stateName), {
                node: decl,
            });
        }
    } else if (typeof stateType === 'object' && stateType.type === 'boolean') {
        // explicit boolean
        resolveBooleanState(mappedStates, stateDefinition);
        return;
    } else if (paramType.type === 'function' && stateType.type in systemValidators) {
        // typed parameter with custom validation
        if (paramType.nodes.length > 0) {
            resolveArguments(paramType, stateType, stateName, diagnostics, decl);
        }
        mappedStates[stateName] = stateType;
    } else if (stateType.type in systemValidators) {
        // typed parameter
        mappedStates[stateName] = stateType;
    } else {
        diagnostics.report(stateDiagnostics.UNKNOWN_STATE_TYPE(stateName, paramType.value), {
            node: decl,
            word: paramType.value,
        });
    }
}
function collectStateArgsDef(
    nodes: ValueNode[],
    stateName: string,
    decl: postcss.Declaration,
    diagnostics: Diagnostics
) {
    const argsFullValue: ValueNode[][] = [];
    const argsFirstNode: Array<ValueNode | undefined> = [];
    let collectedArg: ValueNode[] = [];
    let firstActualValue: ValueNode | undefined = undefined;

    for (const node of nodes) {
        if (node.type === 'div') {
            argsFullValue.push(collectedArg);
            argsFirstNode.push(firstActualValue);
            collectedArg = [];
            firstActualValue = undefined;
        } else {
            collectedArg.push(node);
            if (!firstActualValue && node.type !== 'space' && node.type !== 'comment') {
                firstActualValue = node;
            }
        }
    }

    if (collectedArg.length) {
        argsFullValue.push(collectedArg);
        argsFirstNode.push(firstActualValue);
    }

    if (argsFullValue.length > 2 || (argsFirstNode[1] && argsFirstNode[1].type !== 'string')) {
        diagnostics.report(
            stateDiagnostics.TOO_MANY_STATE_TYPES(
                stateName,
                argsFirstNode.map((argNode) =>
                    argNode ? postcssValueParser.stringify(argNode) : ''
                )
            ),
            {
                node: decl,
                word: decl.value,
            }
        );
    }

    const paramType = argsFirstNode[0];

    if (!paramType) {
        diagnostics.report(stateDiagnostics.MISSING_TYPE_OR_TEMPLATE(stateName), {
            node: decl,
        });
    }

    const template = argsFirstNode[1]
        ? stripQuotation(postcssValueParser.stringify(argsFirstNode[1]))
        : '';

    if (template) {
        if (!template.includes('$0')) {
            diagnostics.report(stateDiagnostics.TEMPLATE_MISSING_PLACEHOLDER(stateName, template), {
                node: decl,
                word: template,
            });
        }
        const placeholders = template.match(/\$\d+/g) || [];
        const unsupportedPlaceholders = placeholders.filter((ph) => ph !== '$0');
        if (unsupportedPlaceholders.length) {
            diagnostics.report(
                stateDiagnostics.TEMPLATE_UNSUPPORTED_PLACEHOLDER(
                    stateName,
                    template,
                    unsupportedPlaceholders
                ),
                {
                    node: decl,
                    word: template,
                }
            );
        }
    }

    return { paramType, template, argsFullValue, argsFirstNode };
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
                diagnostics.report(
                    stateDiagnostics.TOO_MANY_ARGS_IN_VALIDATOR(name, validator.value, args),
                    {
                        node: decl,
                        word: decl.value,
                    }
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

// validation

export interface StateResult {
    res: string;
    errors: string[] | null;
}

export const validationErrors = {
    string: {
        STRING_TYPE_VALIDATION_FAILED: (actualParam: string) =>
            `"${actualParam}" should be of type string`,
        REGEX_VALIDATION_FAILED: (regex: string, actualParam: string) =>
            `expected "${actualParam}" to match regex "${regex}"`,
        CONTAINS_VALIDATION_FAILED: (shouldContain: string, actualParam: string) =>
            `expected "${actualParam}" to contain string "${shouldContain}"`,
        MIN_LENGTH_VALIDATION_FAILED: (length: string, actualParam: string) =>
            `expected "${actualParam}" to be of length longer than or equal to ${length}`,
        MAX_LENGTH_VALIDATION_FAILED: (length: string, actualParam: string) =>
            `expected "${actualParam}" to be of length shorter than or equal to ${length}`,
        UKNOWN_VALIDATOR: (name: string) => `encountered unknown string validator "${name}"`,
    },
    number: {
        NUMBER_TYPE_VALIDATION_FAILED: (actualParam: string) =>
            `expected "${actualParam}" to be of type number`,
        MIN_VALIDATION_FAILED: (actualParam: string, min: string) =>
            `expected "${actualParam}" to be larger than or equal to ${min}`,
        MAX_VALIDATION_FAILED: (actualParam: string, max: string) =>
            `expected "${actualParam}" to be lesser then or equal to ${max}`,
        MULTIPLE_OF_VALIDATION_FAILED: (actualParam: string, multipleOf: string) =>
            `expected "${actualParam}" to be a multiple of ${multipleOf}`,
        UKNOWN_VALIDATOR: (name: string) => `encountered unknown number validator "${name}"`,
    },
    enum: {
        ENUM_TYPE_VALIDATION_FAILED: (actualParam: string, options: string[]) =>
            `expected "${actualParam}" to be one of the options: "${options.join(', ')}"`,
        NO_OPTIONS_DEFINED: () => `expected enum to be defined with one option or more`,
    },
};

export type SubValidator = (value: string, ...rest: string[]) => StateResult;

export interface StateParamType {
    subValidators?: Record<string, SubValidator>;
    validate(
        value: any,
        args: StateArguments,
        resolveParam: any,
        validateDefinition: boolean,
        validateValue: boolean
    ): StateResult;
}

export const systemValidators: Record<string, StateParamType> = {
    string: {
        validate(
            value: any,
            validators: StateArguments,
            resolveParam: (s: string) => string,
            validateDefinition,
            validateValue
        ) {
            const res = value;
            const errors: string[] = [];

            if (validateValue && typeof value !== 'string') {
                errors.push(validationErrors.string.STRING_TYPE_VALIDATION_FAILED(value));
            }

            if (validators.length > 0) {
                validators.forEach((validatorMeta) => {
                    if (typeof validatorMeta === 'object') {
                        if (this.subValidators && this.subValidators[validatorMeta.name]) {
                            const subValidator = this.subValidators[validatorMeta.name];

                            const validationRes = subValidator(
                                value,
                                resolveParam(validatorMeta.args[0])
                            );

                            if (validateValue && validationRes.errors) {
                                errors.push(...validationRes.errors);
                            }
                        } else if (validateDefinition) {
                            errors.push(
                                validationErrors.string.UKNOWN_VALIDATOR(validatorMeta.name)
                            );
                        }
                    }
                });
            }

            return { res, errors: errors.length ? errors : null };
        },
        subValidators: {
            regex: (value: string, regex: string) => {
                const r = new RegExp(regex);
                const valid = r.test(value);

                return {
                    res: value,
                    errors: valid
                        ? null
                        : [validationErrors.string.REGEX_VALIDATION_FAILED(regex, value)],
                };
            },
            contains: (value: string, checkedValue: string) => {
                const valid = !!~value.indexOf(checkedValue);

                return {
                    res: value,
                    errors: valid
                        ? null
                        : [validationErrors.string.CONTAINS_VALIDATION_FAILED(checkedValue, value)],
                };
            },
            minLength: (value: string, length: string) => {
                const valid = value.length >= Number(length);

                return {
                    res: value,
                    errors: valid
                        ? null
                        : [validationErrors.string.MIN_LENGTH_VALIDATION_FAILED(length, value)],
                };
            },
            maxLength: (value: string, length: string) => {
                const valid = value.length <= Number(length);

                return {
                    res: value,
                    errors: valid
                        ? null
                        : [validationErrors.string.MAX_LENGTH_VALIDATION_FAILED(length, value)],
                };
            },
        },
    },
    number: {
        validate(
            value: any,
            validators: StateArguments,
            resolveParam: (s: string) => string,
            validateDefinition,
            validateValue
        ) {
            const res = value;
            const errors: string[] = [];

            if (isNaN(value)) {
                if (validateValue) {
                    errors.push(validationErrors.number.NUMBER_TYPE_VALIDATION_FAILED(value));
                }
            } else if (validators.length > 0) {
                validators.forEach((validatorMeta) => {
                    if (typeof validatorMeta === 'object') {
                        if (this.subValidators && this.subValidators[validatorMeta.name]) {
                            const subValidator = this.subValidators[validatorMeta.name];

                            const validationRes = subValidator(
                                value,
                                resolveParam(validatorMeta.args[0])
                            );

                            if (validateValue && validationRes.errors) {
                                errors.push(...validationRes.errors);
                            }
                        } else if (validateDefinition) {
                            errors.push(
                                validationErrors.number.UKNOWN_VALIDATOR(validatorMeta.name)
                            );
                        }
                    }
                });
            }

            return { res, errors: errors.length ? errors : null };
        },
        subValidators: {
            min: (value: string, minValue: string) => {
                const valid = Number(value) >= Number(minValue);

                return {
                    res: value,
                    errors: valid
                        ? null
                        : [validationErrors.number.MIN_VALIDATION_FAILED(value, minValue)],
                };
            },
            max: (value: string, maxValue: string) => {
                const valid = Number(value) <= Number(maxValue);

                return {
                    res: value,
                    errors: valid
                        ? null
                        : [validationErrors.number.MAX_VALIDATION_FAILED(value, maxValue)],
                };
            },
            multipleOf: (value: string, multipleOf: string) => {
                const valid = Number(value) % Number(multipleOf) === 0;

                return {
                    res: value,
                    errors: valid
                        ? null
                        : [
                              validationErrors.number.MULTIPLE_OF_VALIDATION_FAILED(
                                  value,
                                  multipleOf
                              ),
                          ],
                };
            },
        },
    },
    enum: {
        validate(
            value: any,
            options: StateArguments,
            resolveParam: (s: string) => string,
            validateDefinition,
            validateValue
        ) {
            const res = value;
            const errors: string[] = [];

            const stringOptions: string[] = [];

            if (options.length) {
                const isOneOf = options.some((option) => {
                    if (typeof option === 'string') {
                        stringOptions.push(option);
                        return resolveParam(option) === value;
                    }
                    return true;
                });
                if (validateValue && !isOneOf) {
                    errors.push(
                        validationErrors.enum.ENUM_TYPE_VALIDATION_FAILED(value, stringOptions)
                    );
                }
            } else if (validateDefinition) {
                errors.push(validationErrors.enum.NO_OPTIONS_DEFINED());
            }

            return { res, errors: errors.length ? errors : null };
        },
    },
};

export function validateRuleStateDefinition(
    rule: postcss.Rule,
    meta: StylableMeta,
    resolver: StylableResolver,
    diagnostics: Diagnostics
) {
    const parentRule = rule;
    const selectorAst = parseSelectorWithCache(parentRule.selector);
    if (selectorAst.length && selectorAst.length === 1) {
        const singleSelectorAst = selectorAst[0];
        const selectorChunk = singleSelectorAst.nodes;
        if (selectorChunk.length === 1 && selectorChunk[0].type === 'class') {
            const className = selectorChunk[0].value;
            const classMeta = CSSClass.get(meta, className);
            const states = classMeta?.[`-st-states`];

            if (states && classMeta._kind === 'class') {
                for (const stateName in states) {
                    // TODO: Sort out types
                    const state = states[stateName];
                    if (state && typeof state === 'object') {
                        const { errors } = validateStateArgument(
                            state,
                            meta,
                            state.defaultValue || '',
                            resolver,
                            diagnostics,
                            parentRule,
                            true,
                            !!state.defaultValue
                        );
                        if (errors) {
                            rule.walkDecls((decl) => {
                                if (decl.prop === `-st-states`) {
                                    diagnostics.report(
                                        stateDiagnostics.DEFAULT_PARAM_FAILS_VALIDATION(
                                            stateName,
                                            state.defaultValue || '',
                                            errors
                                        ),
                                        {
                                            node: decl,
                                            word: decl.value,
                                        }
                                    );
                                    return false;
                                }
                                return;
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

// transform

export function transformPseudoClassToCustomState(
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
        diagnostics.report(stateDiagnostics.NO_STATE_ARGUMENT_GIVEN(name, stateDef.type), {
            node: rule,
            word: name,
        });
    }

    const validator = systemValidators[stateDef.type];

    let stateParamOutput: StateResult | undefined;
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
            diagnostics.report(
                stateDiagnostics.FAILED_STATE_VALIDATION(
                    name,
                    actualParam,
                    stateParamOutput.errors
                ),
                {
                    node: rule,
                    word: actualParam,
                }
            );
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
