import {
    ImportSymbol,
    MappedStates,
    safeParse,
    StateParsedValue,
    StylableMeta,
    StylableProcessor,
    valueMapping
} from '@stylable/core';
import { JSONSchema7 } from 'json-schema';

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

export function extractSchema(css: string, filePath: string, root: string, path: MinimalPath) {
    const processor = new StylableProcessor();
    const meta = processor.process(safeParse(css, { from: filePath }));
    return generateSchema(meta, filePath, root, path);
}

export function generateSchema(
    meta: StylableMeta,
    filePath: string,
    basePath: string,
    path: MinimalPath
): ExtractedSchema {
    const schema: ExtractedSchema = {
        $id: `/${path.relative(basePath, filePath).replace(/\\/g, '/')}`,
        $ref: 'stylable/module'
    };

    for (const entry of Object.keys(meta.mappedSymbols)) {
        if (!schema.properties) {
            schema.properties = {};
        }

        const symbol = meta.mappedSymbols[entry];
        schema.properties[entry] = {};

        const schemaEntry = schema.properties[entry];

        if (typeof schemaEntry === 'boolean') {
            continue;
        } else if (symbol._kind === 'class' || symbol._kind === 'element') {
            const states = symbol[valueMapping.states];
            const extended = symbol[valueMapping.extends];
            schemaEntry.$ref = `stylable/${symbol._kind}`;

            if (states) {
                schemaEntry.states = getStatesForSymbol(states);
            }

            if (extended) {
                schemaEntry.extends =
                    extended._kind === 'import' && extended.import
                        ? { $ref: getImportedRef(filePath, extended, basePath, path) }
                        : { $ref: extended.name };
            }
        } else if (symbol._kind === 'var' && typeof schemaEntry !== 'boolean') {
            schemaEntry.$ref = `stylable/${symbol._kind}`;
        }
    }

    return schema;
}

function getStatesForSymbol(states: MappedStates): StateDict {
    const res: StateDict = {};

    for (const stateName of Object.keys(states)) {
        const stateDef = states[stateName];
        if (stateDef === null) {
            // handle boolean states
            res[stateName] = { type: 'boolean' };
        } else if (typeof stateDef === 'object') {
            // handle typed states
            res[stateName] = convertMappedStateToSchema(stateDef);
        } else if (typeof stateDef === 'string') {
            // handle mapped states
            res[stateName] = { type: 'mapped' };
        }
    }

    return res;
}

function convertMappedStateToSchema(state: StateParsedValue): SchemaStates {
    const stateSchema: SchemaStates = { type: state.type };

    if (state.defaultValue) {
        stateSchema.default = state.defaultValue;
    }

    if (state.arguments.length) {
        stateSchema.enum = [];
        for (const arg of state.arguments) {
            if (typeof arg === 'string') {
                // enum options
                stateSchema.enum.push(arg);
            }
        }
    }

    return stateSchema;
}

function getImportedRef(fileName: string, importSymbol: ImportSymbol, basePath: string, path: MinimalPath): string {
    const suffix = importSymbol.type === 'default' ? 'root' : `${importSymbol.name}`;
    return `${normalizeImportPath(fileName, importSymbol.import.fromRelative, basePath, path)}#${suffix}`;
}

function normalizeImportPath(fileName: string, importString: string, basePath: string, path: MinimalPath): string {
    if (importString.startsWith('.')) {
        // is relative
        return '/' + path
            .join(path.dirname(path.relative(basePath, fileName)), importString)
            .replace(/\\/g, '/');
    } else if (path.isAbsolute(importString)) {
        return '/' + path.relative(basePath, importString).replace(/\\/g, '/');
    } else {
        // 3rd party
        return importString.replace(/\\/g, '/');
    }
}
