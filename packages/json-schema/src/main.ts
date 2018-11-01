import { ImportSymbol, MappedStates, StateParsedValue, StylableMeta, valueMapping } from '@stylable/core';
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

export function extractSchema(meta: StylableMeta, basePath: string): ExtractedSchema {
    const schema: ExtractedSchema = {
        $id: meta.source,
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
                schemaEntry.extends = (extended._kind === 'import' && extended.import) ?
                    { $ref: getImportedRef(extended, basePath) } :
                    { $ref: extended.name };
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
        if (stateDef === null) { // handle boolean states
            res[stateName] = { type: 'boolean' };
        } else if (typeof stateDef === 'object') { // handle typed states
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

function getImportedRef(symbol: ImportSymbol, basePath: string): string {
    const is3rdParty = !symbol.import.from.startsWith(basePath);
    const refPath = is3rdParty
        ? `${symbol.import.from}`
        : `./${symbol.import.from.slice(basePath.length)}`;
    const suffix = symbol.type === 'default' ? 'root' : `${symbol.name}`;

    return `${refPath}#${suffix}`;
}
