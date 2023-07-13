import type * as postcss from 'postcss';
import postcssValueParser, {
    type Node as ValueNode,
    type FunctionNode,
} from 'postcss-value-parser';
import cssesc from 'cssesc';
import type { PseudoClass, SelectorNode } from '@tokey/css-selector-parser';
import { createDiagnosticReporter, Diagnostics } from '../diagnostics';
import {
    parseSelectorWithCache,
    stringifySelector,
    convertToClass,
    convertToInvalid,
    convertToSelector,
} from './selector';
import { groupValues, listOptions } from './value';
import { stripQuotation } from './string';
import { evalDeclarationValue } from '../functions';
import type { StylableMeta } from '../stylable-meta';
import type { StylableResolver } from '../stylable-resolver';
import type { ParsedValue } from '../types';
import { CSSClass } from '../features';
import { reservedFunctionalPseudoClasses } from '../native-reserved-lists';
import { BaseAstNode, stringifyCSSValue } from '@tokey/css-value-parser';
import { findCustomIdent, findNextCallNode } from './css-value-seeker';

export interface MappedStates {
    [s: string]: StateParsedValue | string | TemplateStateParsedValue | null;
}
export interface TemplateStateParsedValue {
    type: 'template';
    template: string;
    params: [StateParsedValue];
}
export interface StateParsedValue {
    type: string;
    defaultValue?: string;
    arguments: StateArguments;
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
        '08000',
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
    TEMPLATE_MULTI_PARAMETERS: createDiagnosticReporter(
        '08012',
        'error',
        (state: string) => `pseudo-state "${state}" template only supports a single parameter`
    ),
    TEMPLATE_MISSING_PARAMETER: createDiagnosticReporter(
        '08013',
        'error',
        (state: string) => `pseudo-state "${state}" template expected a parameter definition`
    ),
    UNSUPPORTED_MULTI_SELECTOR: createDiagnosticReporter(
        '08014',
        'error',
        (state: string, finalSelector: string) =>
            `pseudo-state "${state}" resulted in an unsupported multi selector "${finalSelector}"`
    ),
    UNSUPPORTED_COMPLEX_SELECTOR: createDiagnosticReporter(
        '08015',
        'error',
        (state: string, finalSelector: string) =>
            `pseudo-state "${state}" resulted in an unsupported complex selector "${finalSelector}"`
    ),
    INVALID_SELECTOR: createDiagnosticReporter(
        '08016',
        'error',
        (state: string, finalSelector: string) =>
            `pseudo-state "${state}" resulted in an invalid selector "${finalSelector}"`
    ),
    UNSUPPORTED_INITIAL_SELECTOR: createDiagnosticReporter(
        '08017',
        'error',
        (state: string, finalSelector: string) =>
            `pseudo-state "${state}" result cannot start with a type or universal selector "${finalSelector}"`
    ),
    NO_PARAM_REQUIRED: createDiagnosticReporter(
        '08018',
        'error',
        (name: string, param: string) =>
            `pseudo-state "${name}" accepts no parameter, but received "${param}"`
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
        const stateName = stateDefinition.value;
        if (!validateStateName(stateName, diagnostics, decl)) {
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
function validateStateName(name: string, diagnostics: Diagnostics, node: postcss.Node) {
    if (name.startsWith('-')) {
        diagnostics.report(stateDiagnostics.STATE_STARTS_WITH_HYPHEN(name), {
            node: node,
            word: name,
        });
    } else if (reservedFunctionalPseudoClasses.includes(name)) {
        diagnostics.report(stateDiagnostics.RESERVED_NATIVE_STATE(name), {
            node: node,
            word: name,
        });
        return false;
    }
    return true;
}
export function parseStateValue(
    value: BaseAstNode[],
    node: postcss.Node,
    diagnostics: Diagnostics
): [amountTaken: number, stateDef: MappedStates[string] | undefined] {
    let stateName = '';
    let stateDef: MappedStates[string] = null; /*boolean*/
    let amountTaken = 0;
    const customIdentResult = findCustomIdent(value, 0);
    const [amountToName, nameNode] = customIdentResult[0]
        ? customIdentResult
        : findNextCallNode(value, 0);
    if (nameNode && validateStateName(nameNode.value, diagnostics, node)) {
        amountTaken += amountToName;
        stateName = nameNode.value;
        // state with parameter
        if (nameNode.type === 'call') {
            // take all of the definition since default value takes the rest
            amountTaken = value.length;
            // ToDo: translate resolveStateType to tokey and remove the double parsing
            const postcssStateValue = postcssValueParser(
                stringifyCSSValue(value.slice(amountToName - 1))
            );
            // get state definition
            const [stateDefinition, ...stateDefault] = postcssStateValue.nodes;
            const stateMap: MappedStates = {};
            resolveStateType(
                stateDefinition as FunctionNode,
                stateMap,
                stateDefault,
                diagnostics,
                node as postcss.Declaration // ToDo: change to accept any postcss node
            );
            if (stateMap[stateName]) {
                stateDef = stateMap[stateName];
            }
        }
    }
    if (stateName) {
        return [amountTaken, stateDef];
    }
    return [0, undefined];
}
function resolveBooleanState(mappedStates: MappedStates, stateDefinition: ParsedValue) {
    const currentState = mappedStates[stateDefinition.value];
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
    const { paramType, argsFirstNode, argsFullValue } = collectStateArgsDef(stateDefinition.nodes);

    if (!paramType) {
        diagnostics.report(stateDiagnostics.MISSING_TYPE_OR_TEMPLATE(stateName), {
            node: decl,
        });
        return;
    }

    if (paramType?.type === 'string') {
        defineTemplateState(
            stateName,
            paramType,
            argsFirstNode,
            argsFullValue,
            mappedStates,
            diagnostics,
            decl
        );
    } else {
        if (argsFullValue.length > 1) {
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
        defineParamState(
            stateName,
            paramType,
            stateDefault,
            mappedStates,
            diagnostics,
            stateDefinition,
            decl
        );
    }
}
function defineTemplateState(
    stateName: string,
    templateDef: postcssValueParser.StringNode,
    argsFirstNode: (postcssValueParser.Node | undefined)[],
    argsFullValue: postcssValueParser.Node[][],
    mappedStates: MappedStates,
    diagnostics: Diagnostics,
    decl: postcss.Declaration
) {
    const template = stripQuotation(postcssValueParser.stringify(templateDef));
    if (argsFullValue.length === 1) {
        // simple template with no params
        mappedStates[stateName] = template.trim().replace(/\\["']/g, '"');
    } else if (argsFullValue.length === 2) {
        // single parameter template
        if (!template.includes('$0')) {
            diagnostics.report(stateDiagnostics.TEMPLATE_MISSING_PLACEHOLDER(stateName, template), {
                node: decl,
                word: template,
            });
        }

        const paramFullDef = argsFullValue[1];
        const paramTypeDef = argsFirstNode[1];
        if (!paramTypeDef) {
            diagnostics.report(stateDiagnostics.TEMPLATE_MISSING_PARAMETER(stateName), {
                node: decl,
            });
            return;
        }
        const param = createStateParamDef(
            stateName + ' parameter',
            paramTypeDef,
            paramFullDef.splice(paramFullDef.indexOf(paramTypeDef) + 1),
            diagnostics,
            decl
        );
        if (!param) {
            // UNKNOWN_STATE_TYPE reported in createStateParamDef
            return;
        }

        const templateStateType: TemplateStateParsedValue = {
            type: 'template',
            template,
            params: [param],
        };

        mappedStates[stateName] = templateStateType;
    } else {
        // unsupported multiple params
        diagnostics.report(stateDiagnostics.TEMPLATE_MULTI_PARAMETERS(stateName), {
            node: decl,
        });
    }
}
function defineParamState(
    stateName: string,
    paramType: postcssValueParser.Node,
    stateDefault: ParsedValue[],
    mappedStates: MappedStates,
    diagnostics: Diagnostics,
    stateDefinition: FunctionNode,
    decl: postcss.Declaration
) {
    if (paramType.value === 'boolean') {
        // explicit boolean // ToDo: remove support
        resolveBooleanState(mappedStates, stateDefinition);
    } else {
        const stateParamDef = createStateParamDef(
            stateName,
            paramType,
            stateDefault,
            diagnostics,
            decl
        );
        if (stateParamDef) {
            mappedStates[stateName] = stateParamDef;
        }
    }
}
function createStateParamDef(
    stateName: string,
    typeDef: postcssValueParser.Node,
    stateDefault: ParsedValue[],
    diagnostics: Diagnostics,
    decl: postcss.Declaration
): StateParsedValue | undefined {
    const type = typeDef.value;
    if (type in systemValidators && (typeDef.type === 'function' || typeDef.type === 'word')) {
        const stateType: StateParsedValue = {
            type,
            arguments: [],
            defaultValue: postcssValueParser
                .stringify(stateDefault as postcssValueParser.Node[])
                .trim(),
        };
        if (typeDef.type === 'function' && typeDef.nodes.length > 0) {
            resolveArguments(typeDef, stateType, stateName, diagnostics, decl);
        }
        return stateType;
    } else {
        const srcValue = postcssValueParser.stringify(typeDef);
        diagnostics.report(stateDiagnostics.UNKNOWN_STATE_TYPE(stateName, srcValue), {
            node: decl,
            word: srcValue,
        });
        return;
    }
}
function collectStateArgsDef(nodes: ValueNode[]) {
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

    const paramType = argsFirstNode[0];

    return { paramType, argsFullValue, argsFirstNode };
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
    selector: string,
    selectorNode: postcss.Rule | postcss.AtRule,
    meta: StylableMeta,
    resolver: StylableResolver,
    diagnostics: Diagnostics
) {
    const selectorAst = parseSelectorWithCache(selector);
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
                        const stateParam = isTemplateState(state) ? state.params[0] : state;
                        const { errors } = validateStateArgument(
                            stateParam,
                            meta,
                            stateParam.defaultValue || '',
                            resolver,
                            diagnostics,
                            selectorNode,
                            true,
                            !!stateParam.defaultValue
                        );
                        if (errors) {
                            for (const node of selectorNode.nodes) {
                                if (node.type === 'decl' && node.prop === `-st-states`) {
                                    diagnostics.report(
                                        stateDiagnostics.DEFAULT_PARAM_FAILS_VALIDATION(
                                            stateName,
                                            stateParam.defaultValue || '',
                                            errors
                                        ),
                                        {
                                            node: node,
                                            word: node.value,
                                        }
                                    );
                                    break;
                                }
                            }
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
    selectorNode?: postcss.Node,
    validateDefinition?: boolean,
    validateValue = true
) {
    const resolvedValidations: StateResult = {
        res: resolveParam(
            meta,
            resolver,
            diagnostics,
            selectorNode,
            value || stateAst.defaultValue
        ),
        errors: null,
    };

    const { type: paramType } = stateAst;
    const validator = systemValidators[paramType];

    try {
        if (resolvedValidations.res || validateDefinition) {
            const { errors } = validator.validate(
                resolvedValidations.res,
                stateAst.arguments,
                resolveParam.bind(null, meta, resolver, diagnostics, selectorNode),
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
    stateDef: MappedStates[string],
    meta: StylableMeta,
    name: string,
    stateNode: PseudoClass,
    namespace: string,
    resolver: StylableResolver,
    diagnostics: Diagnostics,
    selectorNode?: postcss.Node
) {
    if (stateDef === null || typeof stateDef === 'string') {
        if (stateNode.nodes && selectorNode) {
            diagnostics.report(
                stateDiagnostics.NO_PARAM_REQUIRED(name, stringifySelector(stateNode.nodes)),
                {
                    node: selectorNode,
                    word: stringifySelector(stateNode),
                }
            );
        }
        if (stateDef === null) {
            // boolean
            convertToClass(stateNode).value = createBooleanStateClassName(name, namespace);
        } else {
            // static template selector
            // simply concat global mapped selector - ToDo: maybe change to 'selector'
            convertToInvalid(stateNode).value = stateDef;
        }
        delete stateNode.nodes;
    } else if (typeof stateDef === 'object') {
        if (isTemplateState(stateDef)) {
            convertTemplateState(
                meta,
                resolver,
                diagnostics,
                selectorNode,
                stateNode,
                stateDef,
                name
            );
        } else {
            resolveStateValue(
                meta,
                resolver,
                diagnostics,
                selectorNode,
                stateNode,
                stateDef,
                name,
                namespace
            );
        }
    }
}
export function isTemplateState(state: MappedStates[string]): state is TemplateStateParsedValue {
    return !!state && typeof state === 'object' && state.type === 'template';
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
function convertTemplateState(
    meta: StylableMeta,
    resolver: StylableResolver,
    diagnostics: Diagnostics,
    selectorNode: postcss.Node | undefined,
    stateNode: PseudoClass,
    stateParamDef: TemplateStateParsedValue,
    name: string
) {
    const paramStateDef = stateParamDef.params[0];
    const resolvedParam = getParamInput(
        meta,
        resolver,
        diagnostics,
        selectorNode,
        stateNode,
        paramStateDef,
        name
    );

    validateParam(meta, resolver, diagnostics, selectorNode, paramStateDef, resolvedParam, name);

    const strippedParam = stripQuotation(resolvedParam);
    transformMappedStateWithParam({
        stateName: name,
        template: stateParamDef.template,
        param: strippedParam,
        node: stateNode,
        selectorNode: selectorNode,
        diagnostics,
    });
}
function getParamInput(
    meta: StylableMeta,
    resolver: StylableResolver,
    diagnostics: Diagnostics,
    selectorNode: postcss.Node | undefined,
    stateNode: PseudoClass,
    stateParamDef: StateParsedValue,
    name: string
) {
    const inputValue =
        stateNode.nodes && stateNode.nodes.length ? stringifySelector(stateNode.nodes) : ``;
    const resolvedParam = resolveParam(
        meta,
        resolver,
        diagnostics,
        selectorNode,
        inputValue ? inputValue : stateParamDef.defaultValue
    );

    if (selectorNode && !inputValue && !stateParamDef.defaultValue) {
        diagnostics.report(stateDiagnostics.NO_STATE_ARGUMENT_GIVEN(name, stateParamDef.type), {
            node: selectorNode,
            word: name,
        });
    }
    return resolvedParam;
}
function validateParam(
    meta: StylableMeta,
    resolver: StylableResolver,
    diagnostics: Diagnostics,
    selectorNode: postcss.Node | undefined,
    stateParamDef: StateParsedValue,
    resolvedParam: string,
    name: string
) {
    const validator = systemValidators[stateParamDef.type];

    let stateParamOutput: StateResult | undefined;
    try {
        stateParamOutput = validator.validate(
            resolvedParam,
            stateParamDef.arguments,
            resolveParam.bind(null, meta, resolver, diagnostics, selectorNode),
            false,
            true
        );
    } catch (e) {
        // TODO: warn about validation throwing exception
    }

    if (stateParamOutput !== undefined) {
        if (stateParamOutput.res !== resolvedParam) {
            resolvedParam = stateParamOutput.res;
        }

        if (selectorNode && stateParamOutput.errors) {
            diagnostics.report(
                stateDiagnostics.FAILED_STATE_VALIDATION(
                    name,
                    resolvedParam,
                    stateParamOutput.errors
                ),
                {
                    node: selectorNode,
                    word: resolvedParam,
                }
            );
        }
    }
}
function resolveStateValue(
    meta: StylableMeta,
    resolver: StylableResolver,
    diagnostics: Diagnostics,
    selectorNode: postcss.Node | undefined,
    stateNode: PseudoClass,
    stateParamDef: StateParsedValue,
    name: string,
    namespace: string
) {
    const resolvedParam = getParamInput(
        meta,
        resolver,
        diagnostics,
        selectorNode,
        stateNode,
        stateParamDef,
        name
    );

    validateParam(meta, resolver, diagnostics, selectorNode, stateParamDef, resolvedParam, name);

    const strippedParam = stripQuotation(resolvedParam);
    convertToClass(stateNode).value = createStateWithParamClassName(name, namespace, strippedParam);
    delete stateNode.nodes;
}

function transformMappedStateWithParam({
    stateName,
    template,
    param,
    node,
    selectorNode,
    diagnostics,
}: {
    stateName: string;
    template: string;
    param: string;
    node: PseudoClass;
    selectorNode?: postcss.Node;
    diagnostics: Diagnostics;
}) {
    const targetSelectorStr = template.replace(/\$0/g, param);
    const selectorAst = parseSelectorWithCache(targetSelectorStr, { clone: true });
    if (selectorAst.length > 1) {
        if (selectorNode) {
            diagnostics.report(
                stateDiagnostics.UNSUPPORTED_MULTI_SELECTOR(stateName, targetSelectorStr),
                {
                    node: selectorNode,
                }
            );
        }
        return;
    } else {
        const firstSelector = selectorAst[0].nodes.find(({ type }) => type !== 'comment');
        if (firstSelector?.type === 'type' || firstSelector?.type === 'universal') {
            if (selectorNode) {
                diagnostics.report(
                    stateDiagnostics.UNSUPPORTED_INITIAL_SELECTOR(stateName, targetSelectorStr),
                    {
                        node: selectorNode,
                    }
                );
            }
            return;
        }
        let unexpectedSelector: undefined | SelectorNode = undefined;
        for (const node of selectorAst[0].nodes) {
            if (node.type === 'combinator' || node.type === 'invalid') {
                unexpectedSelector = node;
                break;
            }
        }
        if (unexpectedSelector) {
            if (selectorNode) {
                switch (unexpectedSelector.type) {
                    case 'combinator':
                        diagnostics.report(
                            stateDiagnostics.UNSUPPORTED_COMPLEX_SELECTOR(
                                stateName,
                                targetSelectorStr
                            ),
                            {
                                node: selectorNode,
                            }
                        );
                        break;
                    case 'invalid':
                        diagnostics.report(
                            stateDiagnostics.INVALID_SELECTOR(stateName, targetSelectorStr),
                            {
                                node: selectorNode,
                            }
                        );
                        break;
                }
            }
            return;
        }
    }
    convertToSelector(node).nodes = selectorAst[0].nodes;
}

function resolveParam(
    meta: StylableMeta,
    resolver: StylableResolver,
    diagnostics: Diagnostics,
    node?: postcss.Node,
    nodeContent?: string
) {
    const defaultStringValue = '';
    const param = nodeContent || defaultStringValue;
    return evalDeclarationValue(resolver, param, meta, node, undefined, undefined, diagnostics);
}
