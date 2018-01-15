import { Diagnostics } from './diagnostics';
import { SRule } from './stylable-processor';
import { groupValues, listOptions, MappedStates } from './stylable-value-parsers';
import { StateParsedValue } from './types';

const valueParser = require('postcss-value-parser');

export interface StateTypes {
    string: {
        minLength: string;
        maxLength: string;
        contains: string;
    };
}

export const stateTypesDic: StateTypes = {
    string: {
        minLength: 'number',
        maxLength: 'number',
        contains: 'string'
    }
};
export type stateTypes = keyof StateTypes;
export type validatorTypes = keyof StateTypes['string'];

export function processPseudoStates(value: string, _rule: SRule, _diagnostics: Diagnostics) {

    const mappedStates: MappedStates = {};
    const ast = valueParser(value);
    const statesSplitByComma = groupValues(ast);

    statesSplitByComma.forEach((workingState: StateParsedValue[]) => {
        const [stateDefinition, ...stateDefault] = workingState;
        // handle state declaration
        if (stateDefinition.type === 'function') {
            resolveStateType(stateDefinition, mappedStates, stateDefault);
        } else if (stateDefinition.type === 'word') {
            resolveBooleanState(mappedStates, stateDefinition);
        } else {
            // TODO: error weird state
        }
    });

    return mappedStates;
}

function resolveStateType(stateDefinition: StateParsedValue,
                          mappedStates: MappedStates,
                          stateDefault: StateParsedValue[]) {
    const stateType: StateParsedValue = { ...stateDefinition.nodes[0] };

    if (!stateType) {
        throw new Error('Emtpry State Function');
    }
    if (stateDefinition.nodes.length > 1) {
        throw new Error('Too many Stuff');
    }

    stateType.validators = [];
    stateType.defaultValue = valueParser.stringify(stateDefault).trim();

    if (isCustomMapping(stateDefinition)) {
        mappedStates[stateDefinition.value] = stateType.value.trim().replace(/\\["']/g, '"');
    } else if (stateType.type === 'function') {
        // handle types with arguments
        if (stateType.nodes.length > 0) {
            resolveArguments(stateType);
        }
        mappedStates[stateDefinition.value] = stateType;
    } else if (stateType.value in stateTypesDic) {
        mappedStates[stateDefinition.value] = stateType;
    }
}

function resolveArguments(stateType: StateParsedValue) {
    const seperetedByComma = groupValues(stateType);

    seperetedByComma.forEach(group => {
        if (group.length > 1 || group.length === 0) {
            // TODO: error too many values
        } else {
            const validator = group[0];
            stateType.validators.push({
                name: validator.value,
                args: listOptions(validator)
            });
        }
    });
}

function isCustomMapping(stateDefinition: StateParsedValue) {
    return stateDefinition.nodes.length === 1 && stateDefinition.nodes[0].type === 'string';
}

function resolveBooleanState(mappedStates: MappedStates, stateDefinition: StateParsedValue) {
    const currentState = mappedStates[stateDefinition.value];
    if (!currentState) {
        mappedStates[stateDefinition.value] = null; // add boolean state
    } else {
        // TODO: warn with such name already exists
    }
}

// function isNativeStateType(name: string): name is stateTypes {
//     return !!stateTypesDic[name as stateTypes];
// }

// function isNativeTypeValidator(type: string, validatorName: string): validatorName is validatorTypes {
//     return !!stateTypesDic[type as stateTypes][validatorName as validatorTypes];
// }
