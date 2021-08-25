import type * as postcss from 'postcss';
import { stripQuotation } from './utils';

const UNIVERSAL_SYNTAX_DEFINITION = '*';

interface AtPropertyValidationResponse {
    valid: boolean;
    message?: string;
    remove?: boolean;
}

export const atPropertyValidationWarnings = {
    MISSING_REQUIRED_DESCRIPTOR(descriptorName: string) {
        return `@property rules require a "${descriptorName}" descriptor`;
    },
    MISSING_REQUIRED_INITIAL_VALUE_DESCRIPTOR() {
        return '@property "initial-value" descriptor is optional only if the "syntax" is the universal syntax definition, otherwise the descriptor is required';
    },
};

export function validateAtProperty(atRule: postcss.AtRule): AtPropertyValidationResponse {
    const atPropertyValues: Map<string, string> = new Map();

    if (!atRule.nodes?.length) {
        return {
            valid: true,
            remove: true,
        };
    }

    for (const node of atRule.nodes) {
        if (node.type !== 'decl') {
            continue;
        }

        atPropertyValues.set(node.prop, stripQuotation(node.value));
    }

    if (!atPropertyValues.has('syntax')) {
        return {
            valid: false,
            message: atPropertyValidationWarnings.MISSING_REQUIRED_DESCRIPTOR('syntax'),
        };
    }

    if (!atPropertyValues.has('inherits')) {
        return {
            valid: false,
            message: atPropertyValidationWarnings.MISSING_REQUIRED_DESCRIPTOR('inherits'),
        };
    }

    if (
        !atPropertyValues.has('initial-value') &&
        atPropertyValues.get('syntax') !== UNIVERSAL_SYNTAX_DEFINITION
    ) {
        return {
            valid: false,
            message: atPropertyValidationWarnings.MISSING_REQUIRED_INITIAL_VALUE_DESCRIPTOR(),
        };
    }

    return {
        valid: true,
    };
}
