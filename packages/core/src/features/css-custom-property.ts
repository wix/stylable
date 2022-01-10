import { createFeature } from './feature';
export interface CSSVarSymbol {
    _kind: 'cssVar';
    name: string;
    global: boolean;
}

export const diagnostics = {};

// HOOKS

export const hooks = createFeature({});
