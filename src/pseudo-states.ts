import * as postcss from 'postcss';
import { Diagnostics } from './diagnostics';
import { evalDeclarationValue } from './functions';
import { nativePseudoClasses } from './native-reserved-lists';
import { SelectorAstNode } from './selector-utils';
import { StateParamType, systemValidators } from './state-validators';
import { ClassSymbol, ElementSymbol, SRule, StylableMeta, StylableSymbol } from './stylable-processor';
import { StylableResolver } from './stylable-resolver';
import { groupValues, listOptions, MappedStates } from './stylable-value-parsers';
import { valueMapping } from './stylable-value-parsers';
import { ParsedValue, Pojo, StateParsedValue, StateTypeValidator } from './types';

const valueParser = require('postcss-value-parser');

/* tslint:disable:max-line-length */
const errors = {
    UNKNOWN_STATE_TYPE: (name: string) => `unknown pseudo class "${name}"`,
    VALIDATION_FAILED: (type: string, name: string, args: string[], actualParam: string) => `pseudo-state ${type} validator "${name}(${args.join(', ')})" failed on: "${actualParam}"`,
    UKNOWN_VALIDATOR: (type: string, name: string, args: string[], actualParam: string) => `pseudo-state invoked unknown ${type} validator "${name}(${args.join(', ')})" with "${actualParam}"`,
    VALUE_TYPE_MISMATCH: (type: string, name: string, actualParam: string) => `pseudo-state value "${actualParam}" does not match type "${type}" of "${name}"`
};
/* tslint:enable:max-line-length */

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
        throw new Error('Too many types provided');
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
        if (paramType.nodes.length > 0) {
            resolveArguments(paramType, stateType);
        }
        mappedStates[stateDefinition.value] = stateType;
    } else if (stateType.type in systemValidators) {
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
    resolver: StylableResolver,
    diagnostics: Diagnostics,
    rule?: postcss.Rule) {

    let current = meta;
    let currentSymbol = symbol;

    if (symbol !== originSymbol) {
        const states = originSymbol[valueMapping.states];
        if (states && states.hasOwnProperty(name)) {
            setStateToNode(
                states, meta, name, node, origin.namespace, resolver, diagnostics, rule
            );
            return meta;
        }
    }
    let found = false;
    while (current && currentSymbol) {
        if (currentSymbol._kind === 'class') {
            const states = currentSymbol[valueMapping.states];
            const extend = currentSymbol[valueMapping.extends];

            if (states && states.hasOwnProperty(name)) {
                found = true;
                setStateToNode(
                    states, meta, name, node, current.namespace, resolver, diagnostics, rule
                );
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
            diagnostics.warn(rule, errors.UNKNOWN_STATE_TYPE(name), { word: name });
        }
    }

    return meta;
}

export function setStateToNode(
    states: Pojo<StateParsedValue>,
    meta: StylableMeta,
    name: string,
    node: SelectorAstNode,
    namespace: string,
    resolver: StylableResolver,
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
        resolveState(meta, resolver, diagnostics, rule, node, stateDef, name, namespace);
    }
}

function resolveState(
    meta: StylableMeta,
    resolver: StylableResolver,
    diagnostics: Diagnostics,
    rule: postcss.Rule | undefined,
    node: SelectorAstNode,
    stateDef: StateParsedValue,
    name: string,
    namespace: string) {

    const actualParam = resolveParam(meta, resolver, diagnostics, rule, node.content, stateDef.defaultValue);
    const {type: paramType, validators: paramValidators} = stateDef;
    const validator = systemValidators[stateDef.type];

    if (rule) {

        if (!validator) {
            throw new Error('unhandled validator type'); // TODO: handle with proper diagnostics
        } else if (actualParam) {
            if (!validator.validate(actualParam)) {
                diagnostics.warn(rule, errors.VALUE_TYPE_MISMATCH(
                    stateDef.type, name, actualParam), { word: name }
                );
            }

            for (const subValidator of paramValidators) {
                const currentValidator = validator.subValidators[subValidator.name];

                if (!currentValidator) {
                    diagnostics.warn(rule, errors.UKNOWN_VALIDATOR(
                        stateDef.type, subValidator.name, subValidator.args, actualParam), { word: actualParam }
                    );
                    continue;
                }

                const validatorArg = resolveParam(
                    meta, resolver, diagnostics, rule, subValidator.args[0], stateDef.defaultValue
                );

                if (!currentValidator(actualParam, validatorArg)) {
                    diagnostics.warn(rule, errors.VALIDATION_FAILED(
                        stateDef.type, subValidator.name, subValidator.args, actualParam), { word: actualParam }
                    );
                }
            }
        }
    }
    node.type = 'attribute';
    node.content = `${autoStateAttrName(name, namespace)}="${actualParam}"`;
}

function resolveParam(
    meta: StylableMeta,
    resolver: StylableResolver,
    diagnostics: Diagnostics,
    rule?: postcss.Rule,
    nodeContent?: string,
    defaultValue?: string) {

    const defaultStringValue = '';
    const param = nodeContent || defaultValue || defaultStringValue;

    return rule ? evalDeclarationValue(resolver, param, meta, rule, undefined, undefined, diagnostics) : param;
}

export function autoStateAttrName(stateName: string, namespace: string) {
    return `data-${namespace.toLowerCase()}-${stateName.toLowerCase()}`;
}
