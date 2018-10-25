import { Pojo, StateParsedValue, StylableMeta, valueMapping } from '@stylable/core';
import { MappedStates } from '@stylable/core/dist/src/stylable-value-parsers'; // todo: move this type?

export interface ExtractedSchema {
    $schema: 'http://json-schema.org/draft-06/schema#';
    $id: string;
    $ref: string;
    properties: Pojo;
}

export interface SchemaStates {
    type: string;
    default?: string;
    enum?: string[];
}

export function extractSchema(meta: StylableMeta): ExtractedSchema {
    const schema: ExtractedSchema = {
        $schema: 'http://json-schema.org/draft-06/schema#',
        $id: 'src/...date-display.st.css',
        $ref: 'stylable/module',
        properties: {}
    };

    for (const entry in meta.mappedSymbols) {
        const symbol = meta.mappedSymbols[entry];

        if (symbol._kind === 'class' || symbol._kind === 'element') {
            schema.properties[entry] = {
                type: symbol._kind
            };
            const states = symbol[valueMapping.states];

            if (states) {
                schema.properties[entry].states = getStatesForSymbol(states);
            }
        }
    }

    return schema;
}

function getStatesForSymbol(states: MappedStates): Pojo<SchemaStates> {
    const res: Pojo<SchemaStates> = {};

    for (const stateName in states) {
        const stateDef = states[stateName];
        if (stateDef === null) { // handle boolean states
            res[stateName] = { type: 'boolean' };
        } else if (typeof stateDef === 'object') { // handle typed states
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
            if (typeof arg === 'string') { // enum options
                stateSchema.enum.push(arg);
            }
        }
    }

    return stateSchema;
}
