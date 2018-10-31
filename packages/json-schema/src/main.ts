import { ImportSymbol, Pojo, StateParsedValue, StylableMeta, valueMapping } from '@stylable/core';
import { MappedStates } from '@stylable/core/dist/src/stylable-value-parsers'; // todo: move this type?

export interface ExtractedSchema {
    $schema: 'http://json-schema.org/draft-06/schema#';
    $id: string;
    $ref: string;
    properties: Pojo<SchemaEntry>;
}

export interface SchemaEntry {
    extends?: { $ref?: string };
    type?: string;
    states?: Pojo<SchemaStates>;
}

export interface SchemaStates {
    type: string;
    default?: string;
    enum?: string[];
}

export function extractSchema(meta: StylableMeta, basePath: string): ExtractedSchema {
    const schema: ExtractedSchema = {
        $schema: 'http://json-schema.org/draft-06/schema#',
        $id: meta.source,
        $ref: 'stylable/module',
        properties: {}
    };

    for (const entry of Object.keys(meta.mappedSymbols)) {
        const symbol = meta.mappedSymbols[entry];
        schema.properties[entry] = {};

        if (symbol._kind === 'class' || symbol._kind === 'element') {
            const schemaEntry = schema.properties[entry];
            const states = symbol[valueMapping.states];
            const extended = symbol[valueMapping.extends];
            schemaEntry.type = symbol._kind;

            if (states) {
                schemaEntry.states = getStatesForSymbol(states);
            }

            if (extended) {
                if (extended._kind === 'import' && extended.import) {
                    schemaEntry.extends = { $ref: getImportedRef(extended, basePath) };
                } else {
                    schemaEntry.extends = { $ref: extended.name };
                }
            }
        } else if (symbol._kind === 'var') {
            schema.properties[entry].type = symbol._kind;
        }
    }

    return schema;
}

function getStatesForSymbol(states: MappedStates): Pojo<SchemaStates> {
    const res: Pojo<SchemaStates> = {};

    for (const stateName of Object.keys(states)) {
        const stateDef = states[stateName];
        if (stateDef === null) {
            // handle boolean states
            res[stateName] = { type: 'boolean' };
        } else if (typeof stateDef === 'object') {
            // handle typed states
            res[stateName] = convertMappedStateToSchema(stateDef);
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
