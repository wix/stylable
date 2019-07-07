import { JSONSchema7 } from 'json-schema';

export const stylableModule = 'stylable/module';
export const stylableClass = 'stylable/class';
export const stylableElement = 'stylable/element';
export const stylableVar = 'stylable/var';
export const stylableCssVar = 'stylable/cssVar';

export function isStylableModuleSchema(schema: any): schema is StylableModuleSchema {
    return !!schema && !!schema.$ref && schema.$ref === stylableModule;
}

export interface StylableModuleSchema extends JSONSchema7 {
    namespace: string;
    moduleDependencies?: string[];
    properties?: {
        [key: string]: boolean | StylableSymbolSchema;
    };
}

export interface StylableSymbolSchema extends JSONSchema7 {
    states?: StateDict;
    extends?: { $ref: string };
}

export type StateDict = { [stateName: string]: SchemaStates } & object;

export interface SchemaStates {
    type: string;
    default?: string;
    enum?: string[];
}

export interface MinimalPath {
    dirname: (p: string) => string;
    join: (...paths: string[]) => string;
    isAbsolute: (path: string) => boolean;
    relative: (from: string, to: string) => string;
}
