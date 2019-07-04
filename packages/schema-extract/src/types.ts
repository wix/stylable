import { JSONSchema7 } from 'json-schema';

export const stylableModule = 'stylable/module';
export const stylableClass = 'stylable/class';
export const stylableElement = 'stylable/element';
export const stylableVar = 'stylable/var';

export type StateDict = { [stateName: string]: SchemaStates } & object;

export interface ExtractedSchema extends JSONSchema7 {
    states?: StateDict;
    extends?: { $ref: string };
    properties?: {
        [key: string]: boolean | ExtractedSchema;
    };
}

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