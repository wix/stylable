import { paramMapping, parseStGlobalCustomProperty } from '@stylable/core';
import postcss from 'postcss';
import type { CodeMod } from './apply-code-mods';

export const stGlobalCustomPropertyToAtProperty: CodeMod = (ast, diagnostics) => {
    ast.walkAtRules('st-global-custom-property', (atRule) => {
        const properties = parseStGlobalCustomProperty(atRule, diagnostics);
        const fatalDiagnostics = diagnostics.reports.filter((report) => report.type !== 'info');

        if (diagnostics.reports.some((report) => report.type !== 'info')) {
            diagnostics.reports = fatalDiagnostics;
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
            diagnostics.reports = [];
        }
    });
};
