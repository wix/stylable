import { createFeature } from './feature';
import {
    stateDiagnostics,
    parsePseudoStates,
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
} from '../helpers/custom-state';

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
    transformPseudoClassToCustomState,
    delimiters,
    createBooleanStateClassName,
    createStateWithParamClassName,
    systemValidators,
    sysValidationErrors,
    resolveStateParam,
    isTemplateState,
};
