import * as postcss from 'postcss';
import { Diagnostics } from './diagnostics';
import { evalDeclarationValue } from './functions';
import { nativePseudoClasses } from './native-reserved-lists';
import { SelectorAstNode } from './selector-utils';
import { StateResult, systemValidators } from './state-validators';
import { ClassSymbol, ElementSymbol, SRule, StylableMeta, StylableSymbol } from './stylable-processor';
import { StylableResolver } from './stylable-resolver';
import { groupValues, listOptions, MappedStates } from './stylable-value-parsers';
import { valueMapping } from './stylable-value-parsers';
import { ParsedValue, Pojo, StateParsedValue } from './types';
import { stripQuotation } from './utils';

const isVendorPrefixed = require('is-vendor-prefixed');
const valueParser = require('postcss-value-parser');

/* tslint:disable:max-line-length */
export const stateErrors = {
    UNKNOWN_STATE_USAGE: (name: string) => `unknown pseudo-state "${name}"`,
    UNKNOWN_STATE_TYPE: (name: string, type: string) => `pseudo-state "${name}" defined with unknown type: "${type}"`,
    TOO_MANY_STATE_TYPES: (name: string, types: string[]) => `pseudo-state "${name}(${types.join(', ')})" definition must be of a single type`,
    NO_STATE_TYPE_GIVEN: (name: string) => `pseudo-state "${name}" expected a definition of a single type, but received none`,
    TOO_MANY_ARGS_IN_VALIDATOR: (name: string, validator: string, args: string[]) => `pseudo-state "${name}" expected "${validator}" validator to receive a single argument, but it received "${args.join(', ')}"`,
    STATE_VARIABLE_NAME_CLASH: (name: string) => `state "${name}" definition cannot begin with "--"`
};
/* tslint:enable:max-line-length */

// PROCESS

export function processPseudoStates(value: string, decl: postcss.Declaration, diagnostics: Diagnostics) {

    const mappedStates: MappedStates = {};
    const ast = valueParser(value);
    const statesSplitByComma = groupValues(ast.nodes);

    statesSplitByComma.forEach((workingState: ParsedValue[]) => {
        const [stateDefinition, ...stateDefault] = workingState;

        if (stateDefinition.value.trim().startsWith('--')) {
            diagnostics.error(
                decl,
                stateErrors.STATE_VARIABLE_NAME_CLASH(stateDefinition.value),
                { word: stateDefinition.value });
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
    decl: postcss.Declaration) {

    if (stateDefinition.type === 'function' && stateDefinition.nodes.length === 0) {
        resolveBooleanState(mappedStates, stateDefinition);

        diagnostics.warn(decl,
            stateErrors.NO_STATE_TYPE_GIVEN(stateDefinition.value),
            { word: decl.value });

        return;
    }

    if (stateDefinition.nodes.length > 1) {
        diagnostics.warn(decl,
            stateErrors.TOO_MANY_STATE_TYPES(stateDefinition.value, listOptions(stateDefinition)),
            { word: decl.value });
    }

    const paramType = stateDefinition.nodes[0];
    const stateType: StateParsedValue = {
        type: stateDefinition.nodes[0].value,
        arguments: [],
        defaultValue: valueParser.stringify(stateDefault).trim()
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
        diagnostics.warn(decl, stateErrors.UNKNOWN_STATE_TYPE(
            stateDefinition.value, paramType.value),
            { word: paramType.value }
        );
    }
}

function resolveArguments(
    paramType: ParsedValue,
    stateType: StateParsedValue,
    name: string,
    diagnostics: Diagnostics,
    decl: postcss.Declaration) {

    const seperetedByComma = groupValues(paramType.nodes);

    seperetedByComma.forEach(group => {
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
                    args
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

export function validateStateDefinition(
    decl: postcss.Declaration,
    meta: StylableMeta,
    resolver: StylableResolver,
    diagnostics: Diagnostics) {

    if (decl.parent && decl.parent.type !== 'root') {
        const container = decl.parent;
        if (container.type !== 'atrule') {
            const sRule: SRule = container as SRule;
            if (sRule.selectorAst.nodes && sRule.selectorAst.nodes.length === 1) {
                const singleSelectorAst = sRule.selectorAst.nodes[0];
                const selectorChunk = singleSelectorAst.nodes;

                if (selectorChunk.length === 1 && selectorChunk[0].type === 'class') {
                    const className = selectorChunk[0].name;
                    const classMeta = meta.classes[className];

                    if (classMeta && classMeta._kind === 'class') {
                        for (const stateName in classMeta[valueMapping.states]) {
                            const state = classMeta[valueMapping.states][stateName];
                            if (state && typeof state === 'object') {
                                const res = validateStateArgument(
                                    state,
                                    meta,
                                    state.defaultValue || '',
                                    resolver,
                                    diagnostics,
                                    sRule,
                                    true,
                                    !!state.defaultValue
                                );

                                if (res.errors) {
                                    // tslint:disable-next-line:max-line-length
                                    res.errors.unshift(`pseudo-state "${stateName}" default value "${state.defaultValue}" failed validation:`);
                                    diagnostics.warn(decl,
                                        res.errors.join('\n'),
                                        { word: decl.value });
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
}

export function validateStateArgument(
    stateAst: StateParsedValue,
    meta: StylableMeta,
    value: string,
    resolver: StylableResolver,
    diagnostics: Diagnostics,
    rule?: postcss.Rule,
    validateDefinition?: boolean,
    validateValue: boolean = true) {

    const resolvedValidations: StateResult = {
        res: resolveParam(meta, resolver, diagnostics, rule, value || stateAst.defaultValue),
        errors: null
    };

    const { type: paramType } = stateAst;
    const validator = systemValidators[paramType];

    try {
        if (resolvedValidations.res || validateDefinition) {
            const { errors } = validator.validate(resolvedValidations.res,
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

export function transformPseudoStateSelector(
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

    if (originSymbol && symbol !== originSymbol) {
        current = origin;
        currentSymbol = originSymbol;
    }
    let found = false;
    while (current && currentSymbol) {
        if (currentSymbol._kind === 'class' || currentSymbol._kind === 'element') {
            const states = currentSymbol[valueMapping.states];
            const extend = currentSymbol[valueMapping.extends];
            const alias = currentSymbol.alias;
            if (states && states.hasOwnProperty(name)) {
                found = true;
                setStateToNode(
                    states, meta, name, node, current.namespace, resolver, diagnostics, rule
                );
                break;
            } else if (extend) {
                if (current.mappedSymbols[extend.name] && current.mappedSymbols[extend.name]._kind !== 'import') {
                    const nextCurrentSymbol = current.mappedSymbols[extend.name];
                    if (currentSymbol === nextCurrentSymbol) {
                        break;
                    }
                    currentSymbol = nextCurrentSymbol;
                } else {
                    const next = resolver.resolve(extend);
                    if (next && next.meta) {
                        currentSymbol = next.symbol;
                        current = next.meta;
                    } else {
                        break;
                    }
                }
            } else if (alias) {
                const next = resolver.resolve(alias);
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
        if (nativePseudoClasses.indexOf(name) === -1 && !isVendorPrefixed(name)) {
            diagnostics.warn(rule, stateErrors.UNKNOWN_STATE_USAGE(name), { word: name });
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
        resolveStateValue(meta, resolver, diagnostics, rule, node, stateDef, name, namespace);
    }
}

function resolveStateValue(
    meta: StylableMeta,
    resolver: StylableResolver,
    diagnostics: Diagnostics,
    rule: postcss.Rule | undefined,
    node: SelectorAstNode,
    stateDef: StateParsedValue,
    name: string,
    namespace: string) {

    let actualParam = resolveParam(meta, resolver, diagnostics, rule, node.content || stateDef.defaultValue);

    const validator = systemValidators[stateDef.type];

    let stateParamOutput;
    try {
        stateParamOutput = validator.validate(actualParam,
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

            diagnostics.warn(rule,
                stateParamOutput.errors.join('\n'),
                { word: actualParam });
        }
    }

    node.type = 'attribute';

    const selectorSuffix = stateDef.type === 'tag' ? '~' : undefined; // TODO: should be generic

    const strippedParam = stripQuotation(actualParam);
    node.content = `${autoStateAttrName(name, namespace, selectorSuffix)}=${JSON.stringify(strippedParam)}`;
}

function resolveParam(
    meta: StylableMeta,
    resolver: StylableResolver,
    diagnostics: Diagnostics,
    rule?: postcss.Rule,
    nodeContent?: string) {

    const defaultStringValue = '';
    const param = nodeContent || defaultStringValue;

    return rule ? evalDeclarationValue(resolver, param, meta, rule, undefined, undefined, diagnostics) : param;
}

export function autoStateAttrName(stateName: string, namespace: string, suffix = '') {
    return `data-${namespace.toLowerCase()}-${stateName.toLowerCase()}${suffix}`;
}
