import type * as postcss from 'postcss';
import type { Diagnostics, DiagnosticsBank } from '../diagnostics';
import { stripQuotation } from '../helpers/string';

const UNIVERSAL_SYNTAX_DEFINITION = '*';
const AT_PROPERTY_DISCRIPTOR_LIST = ['initial-value', 'syntax', 'inherits'];

interface AtPropertyValidationResponse {
    valid: boolean;
}

export const atPropertyValidationWarnings: DiagnosticsBank = {
    MISSING_REQUIRED_DESCRIPTOR(descriptorName: string) {
        return {
            code: '01001',
            message: `@property rules require a "${descriptorName}" descriptor`,
            severity: 'error',
        };
    },
    MISSING_REQUIRED_INITIAL_VALUE_DESCRIPTOR() {
        return {
            code: '01002',
            message:
                '@property "initial-value" descriptor is optional only if the "syntax" is the universal syntax definition, otherwise the descriptor is required',
            severity: 'warning',
        };
    },
    INVALID_DESCRIPTOR_TYPE(descriptorType: string) {
        return {
            code: '01003',
            message: `@property does not support descriptor of type "${descriptorType}"`,
            severity: 'error',
        };
    },
    INVALID_DESCRIPTOR_NAME(descriptorName: string) {
        return {
            code: '01004',
            message: `@property does not support descriptor named "${descriptorName}"`,
            severity: 'error',
        };
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
                diagnostics.report(
                    atPropertyValidationWarnings.INVALID_DESCRIPTOR_TYPE(node.type),
                    {
                        node,
                        options: { word: 'params' in node ? node.params : node.selector },
                    }
                );
            }

            continue;
        }

        if (!AT_PROPERTY_DISCRIPTOR_LIST.includes(node.prop)) {
            diagnostics.report(atPropertyValidationWarnings.INVALID_DESCRIPTOR_NAME(node.prop), {
                node,
                options: { word: node.prop },
            });

            continue;
        }

        atPropertyValues.set(node.prop, stripQuotation(node.value));
    }

    if (!atPropertyValues.has('syntax')) {
        diagnostics.report(atPropertyValidationWarnings.MISSING_REQUIRED_DESCRIPTOR('syntax'), {
            node: atRule,
            options: { word: name },
        });

        return {
            valid: false,
        };
    }

    if (!atPropertyValues.has('inherits')) {
        diagnostics.report(atPropertyValidationWarnings.MISSING_REQUIRED_DESCRIPTOR('inherits'), {
            node: atRule,
            options: { word: name },
        });

        return {
            valid: false,
        };
    }

    if (
        !atPropertyValues.has('initial-value') &&
        atPropertyValues.get('syntax') !== UNIVERSAL_SYNTAX_DEFINITION
    ) {
        diagnostics.report(
            atPropertyValidationWarnings.MISSING_REQUIRED_INITIAL_VALUE_DESCRIPTOR(),
            {
                node: atRule,
                options: { word: name },
            }
        );

        return {
            valid: false,
        };
    }

    return {
        valid: true,
    };
}

export function validateCustomPropertyName(value: string) {
    return value.startsWith('--');
}

export function generateScopedCSSVar(namespace: string, varName: string) {
    return `--${namespace}-${varName}`;
}
