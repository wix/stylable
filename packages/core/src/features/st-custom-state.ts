import { createFeature } from './feature.js';
import {
    stateDiagnostics,
    parsePseudoStates,
    parseStateValue,
    transformPseudoClassToCustomState,
    booleanStateDelimiter,
    stateMiddleDelimiter,
    stateWithParamDelimiter,
    createBooleanStateClassName,
    createStateWithParamClassName,
    systemValidators,
    validationErrors as sysValidationErrors,
    resolveStateParam,
    isTemplateState,
    MappedStates,
} from '../helpers/custom-state.js';

export interface HasStates {
    '-st-states': MappedStates;
}

export const diagnostics = {
    ...stateDiagnostics,
};

// HOOKS

export const hooks = createFeature({});

const delimiters = {
    booleanStateDelimiter,
    stateMiddleDelimiter,
    stateWithParamDelimiter,
};
export {
    parsePseudoStates,
    parseStateValue,
    transformPseudoClassToCustomState,
    delimiters,
    createBooleanStateClassName,
    createStateWithParamClassName,
    systemValidators,
    sysValidationErrors,
    resolveStateParam,
    isTemplateState,
    MappedStates,
};
