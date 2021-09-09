import {
    CSSVarSymbol,
    Diagnostics,
    isCSSVarProp,
    paramMapping,
    processorWarnings,
} from '@stylable/core';
import * as postcss from 'postcss';
import type { CodeMod } from './apply-code-mods';

export const stGlobalCustomPropertyToAtProperty: CodeMod = (ast, diagnostics) => {
    ast.walkAtRules('st-global-custom-property', (atRule) => {
        const properties = parseStGlobalCustomProperty(atRule, diagnostics);
        const fatalDiagnostics = diagnostics.reports.filter((report) => report.type !== 'info');

        if (fatalDiagnostics.length) {
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

function parseStGlobalCustomProperty(
    atRule: postcss.AtRule,
    diagnostics: Diagnostics
): CSSVarSymbol[] {
    const cssVars: CSSVarSymbol[] = [];
    const cssVarsByComma = atRule.params.split(',');
    const cssVarsBySpacing = atRule.params
        .trim()
        .split(/\s+/g)
        .filter((s) => s !== ',');

    if (cssVarsBySpacing.length > cssVarsByComma.length) {
        diagnostics.warn(atRule, processorWarnings.GLOBAL_CSS_VAR_MISSING_COMMA(atRule.params), {
            word: atRule.params,
        });
        return cssVars;
    }

    for (const entry of cssVarsByComma) {
        const cssVar = entry.trim();

        if (isCSSVarProp(cssVar)) {
            cssVars.push({
                _kind: 'cssVar',
                name: cssVar,
                global: true,
            });
        } else {
            diagnostics.warn(atRule, processorWarnings.ILLEGAL_GLOBAL_CSS_VAR(cssVar), {
                word: cssVar,
            });
        }
    }

    return cssVars;
}
