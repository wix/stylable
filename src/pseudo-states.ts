import * as postcss from 'postcss';
import { Diagnostics } from './diagnostics';
import { nativePseudoClasses } from './native-reserved-lists';
import { SelectorAstNode } from './selector-utils';
import { StringValidatorFunctions, validators } from './state-validators';
import { ClassSymbol, ElementSymbol, SRule, StylableMeta, StylableSymbol } from './stylable-processor';
import { StylableResolver } from './stylable-resolver';
import { groupValues, listOptions, MappedStates } from './stylable-value-parsers';
import { valueMapping } from './stylable-value-parsers';
import { ParsedValue, Pojo, StateParsedValue, StateTypes, StateTypeValidator, StringValidators } from './types';

const valueParser = require('postcss-value-parser');

export const stateTypesDic: StateTypes = {
    string: {
        contains: 'string'
    }
};
export type stateTypes = keyof StateTypes;
export type validatorTypes = keyof StateTypes['string'];

// PROCESS

export function processPseudoStates(value: string, _rule: SRule, _diagnostics: Diagnostics) {

    const mappedStates: MappedStates = {};
    const ast = valueParser(value);
    const statesSplitByComma = groupValues(ast.nodes);

    statesSplitByComma.forEach((workingState: ParsedValue[]) => {
        const [stateDefinition, ...stateDefault] = workingState;
        // handle state declaration
        if (stateDefinition.type === 'function') {
            resolveStateType(stateDefinition, mappedStates, stateDefault);
        } else if (stateDefinition.type === 'word') {
            resolveBooleanState(mappedStates, stateDefinition);
        } else {
            // TODO: error weird state
        }
    });

    return mappedStates;
}

function resolveStateType(
    stateDefinition: ParsedValue,
    mappedStates: MappedStates,
    stateDefault: ParsedValue[]) {
    // if (!stateType) {
    //     throw new Error('Emtpry State Function');
    // }
    if (stateDefinition.nodes.length > 1) {
        throw new Error('Too many Stuff');
    }
    const paramType = stateDefinition.nodes[0];
    const stateType: StateParsedValue = {
        type: stateDefinition.nodes[0].value,
        validators: [],
        defaultValue: valueParser.stringify(stateDefault).trim()
    };

    if (isCustomMapping(stateDefinition)) {
        mappedStates[stateDefinition.value] = stateType.type.trim().replace(/\\["']/g, '"');
    } else if (paramType.type === 'function') {
        // handle types with arguments
        if (paramType.nodes.length > 0) {
            resolveArguments(paramType, stateType);
        }
        mappedStates[stateDefinition.value] = stateType;
    } else if (stateType.type in stateTypesDic) {
        mappedStates[stateDefinition.value] = stateType;
    }
}

function resolveArguments(stateDefinition: ParsedValue, stateType: StateParsedValue) {
    const seperetedByComma = groupValues(stateDefinition.nodes);

    seperetedByComma.forEach(group => {
        if (group.length > 1 || group.length === 0) {
            // TODO: error too many values
        } else {
            const validator = group[0];
            stateType.validators.push({
                name: validator.value,
                args: listOptions(validator)
            });
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

export type AutoStateAttrName = (stateName: string, namespace: string) => string;

export function resolvePseudoState(
    meta: StylableMeta,
    node: SelectorAstNode,
    name: string,
    symbol: StylableSymbol | null,
    origin: StylableMeta,
    originSymbol: ClassSymbol | ElementSymbol,
    autoStateAttrName: AutoStateAttrName,
    resolver: StylableResolver,
    diagnostics: Diagnostics,
    rule?: postcss.Rule) {

    let current = meta;
    let currentSymbol = symbol;

    if (symbol !== originSymbol) {
        const states = originSymbol[valueMapping.states];
        if (states && states.hasOwnProperty(name)) {
            setStateToNode(states, name, node, origin.namespace, autoStateAttrName, diagnostics, rule);
            return current;
        }
    }
    let found = false;
    while (current && currentSymbol) {
        if (currentSymbol._kind === 'class') {
            const states = currentSymbol[valueMapping.states];
            const extend = currentSymbol[valueMapping.extends];

            if (states && states.hasOwnProperty(name)) {
                found = true;
                setStateToNode(states, name, node, current.namespace, autoStateAttrName, diagnostics, rule);
                break;
            } else if (extend) {
                const next = resolver.resolve(extend);
                if (next && next.meta) {
                    currentSymbol = next.symbol;
                    current = next.meta;
                } else {
                    break;
                }
            } else {
                break;
            }
        } else {
            break;
        }
    }

    if (!found && rule) {
        if (nativePseudoClasses.indexOf(name) === -1) {
            diagnostics.warn(rule, `unknown pseudo class "${name}"`, { word: name });
        }
    }

    return current;
}

export function setStateToNode(
    states: Pojo<StateParsedValue>,
    name: string,
    node: SelectorAstNode,
    namespace: string,
    autoStateAttrName: AutoStateAttrName,
    diagnostics: Diagnostics,
    rule?: postcss.Rule) {

    const stateDef = states[name];

    if (stateDef === null) {
        node.type = 'attribute';
        node.content = autoStateAttrName(name, namespace);
    } else if (typeof stateDef === 'string') {
        node.type = 'invalid'; // simply concat global mapped selector - ToDo: maybe change to 'selector'
        node.value = stateDef;
    } else if (typeof stateDef === 'object') {
        switch (stateDef.type) {
            case 'string':
                const defaultStringValue = '';
                const actualParam = node.content || stateDef.defaultValue || defaultStringValue;

                if (rule) {
                    stateDef.validators.forEach((validator: StateTypeValidator) => {
                        const currentValidator = getStringValidatorFunc(validator.name);
                        if (!currentValidator(actualParam, validator.args[0])) {
                            // tslint:disable-next-line:max-line-length
                            diagnostics.warn(rule, `pseudo-state ${stateDef.type} validator "${validator.name}(${validator.args.join(', ')})" failed on: "${actualParam}"`, { word: actualParam });
                        }
                    });
                }
                node.type = 'attribute';
                node.content = `${autoStateAttrName(name, namespace)}="${actualParam}"`;
                break;
            default:
                throw new Error('unhandled validator type'); // TODO: handle with proper diagnostics
        }
    }
}

function getStringValidatorFunc(name: keyof StringValidatorFunctions) {
    return validators.string[name];
}

export function autoStateAttrName(stateName: string, namespace: string) {
    return `data-${namespace.toLowerCase()}-${stateName.toLowerCase()}`;
}

// function isNativeStateType(name: string): name is stateTypes {
//     return !!stateTypesDic[name as stateTypes];
// }

// function isNativeTypeValidator(type: string, validatorName: string): validatorName is validatorTypes {
//     return !!stateTypesDic[type as stateTypes][validatorName as validatorTypes];
// }
