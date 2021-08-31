import { Diagnostics, paramMapping, parseStGlobalCustomProperty } from '@stylable/core';
import postcss from 'postcss';
import type { CodeMod } from './apply-code-mods';

export const stGlobalCustomPropertyToAtProperty: CodeMod = (ast, messages) => {
    ast.walkAtRules('st-global-custom-property', (atRule) => {
        const diagnostics = new Diagnostics();
        const properties = parseStGlobalCustomProperty(atRule, diagnostics);

        if (diagnostics.reports.some((report) => report.type !== 'info')) {
            messages.push(`failed to parse/replace "st-global-custom-property"`);
        } else {
            for (const property of properties) {
                atRule.before(
                    postcss.atRule({
                        name: 'property',
                        params: `${paramMapping.global}(${property.name})`,
                    })
                );
            }

            atRule.remove();
        }
    });
};
