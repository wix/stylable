import type * as postcss from 'postcss';
import type { Diagnostics } from '../diagnostics';
import { stripQuotation } from '../utils';

const UNIVERSAL_SYNTAX_DEFINITION = '*';
const AT_PROPERTY_DISCRIPTOR_LIST = ['initial-value', 'syntax', 'inherits'];

interface AtPropertyValidationResponse {
    valid: boolean;
}

export const atPropertyValidationWarnings = {
    MISSING_REQUIRED_DESCRIPTOR(descriptorName: string) {
        return `@property rules require a "${descriptorName}" descriptor`;
    },
    MISSING_REQUIRED_INITIAL_VALUE_DESCRIPTOR() {
        return '@property "initial-value" descriptor is optional only if the "syntax" is the universal syntax definition, otherwise the descriptor is required';
    },
    INVALID_DESCRIPTOR_TYPE(descriptorType: string) {
        return `@property does not support descriptor of type "${descriptorType}"`;
    },
    INVALID_DESCRIPTOR_NAME(descriptorName: string) {
        return `@property does not support descriptor named "${descriptorName}"`;
    },
};

export function validateAtProperty(
    atRule: postcss.AtRule,
    diagnostics: Diagnostics
): AtPropertyValidationResponse {
    const name = atRule.params;
    const atPropertyValues: Map<string, string> = new Map();

    if (!atRule.nodes?.length) {
        return {
            valid: true,
        };
    }

    for (const node of atRule.nodes) {
        if (node.type !== 'decl') {
            if (node.type === 'atrule' || node.type === 'rule') {
                diagnostics.warn(
                    node,
                    atPropertyValidationWarnings.INVALID_DESCRIPTOR_TYPE(node.type),
                    {
                        word: 'params' in node ? node.params : node.selector,
                    }
                );
            }

            continue;
        }

        if (!AT_PROPERTY_DISCRIPTOR_LIST.includes(node.prop)) {
            diagnostics.warn(
                node,
                atPropertyValidationWarnings.INVALID_DESCRIPTOR_NAME(node.prop),
                {
                    word: node.prop,
                }
            );

            continue;
        }

        atPropertyValues.set(node.prop, stripQuotation(node.value));
    }

    if (!atPropertyValues.has('syntax')) {
        diagnostics.warn(
            atRule,
            atPropertyValidationWarnings.MISSING_REQUIRED_DESCRIPTOR('syntax'),
            { word: name }
        );

        return {
            valid: false,
        };
    }

    if (!atPropertyValues.has('inherits')) {
        diagnostics.warn(
            atRule,
            atPropertyValidationWarnings.MISSING_REQUIRED_DESCRIPTOR('inherits'),
            { word: name }
        );

        return {
            valid: false,
        };
    }

    if (
        !atPropertyValues.has('initial-value') &&
        atPropertyValues.get('syntax') !== UNIVERSAL_SYNTAX_DEFINITION
    ) {
        diagnostics.warn(
            atRule,
            atPropertyValidationWarnings.MISSING_REQUIRED_INITIAL_VALUE_DESCRIPTOR(),
            { word: name }
        );

        return {
            valid: false,
        };
    }

    return {
        valid: true,
    };
}
