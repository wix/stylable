import { validateAtProperty } from '../helpers/css-custom-property';
import { createFeature, FeatureContext } from './feature';
import * as STSymbol from './st-symbol';
import type * as postcss from 'postcss';
// ToDo: refactor out
import postcssValueParser from 'postcss-value-parser';
// ToDo: move to helpers
import { globalValue } from '../utils';
import { isCSSVarProp } from '../stylable-utils';
import { validateAllowedNodesUntil } from '../stylable-value-parsers';

export interface CSSVarSymbol {
    _kind: 'cssVar';
    name: string;
    global: boolean;
}

export const diagnostics = {
    ILLEGAL_CSS_VAR_USE(name: string) {
        return `a custom css property must begin with "--" (double-dash), but received "${name}"`;
    },
    ILLEGAL_CSS_VAR_ARGS(name: string) {
        return `custom property "${name}" usage (var()) must receive comma separated values`;
    },
};

// HOOKS

export const hooks = createFeature({
    analyzeAtRule({ context, atRule }) {
        addCSSVarDefinition(context, atRule);
        validateAtProperty(atRule, context.diagnostics);
    },
    analyzeDeclaration({ context, decl }) {
        if (isCSSVarProp(decl.prop)) {
            addCSSVarDefinition(context, decl);
        }
        if (decl.value.includes('var(')) {
            handleCSSVarUse(context, decl);
        }
    },
});

function handleCSSVarUse(context: FeatureContext, decl: postcss.Declaration) {
    const parsed = postcssValueParser(decl.value);
    parsed.walk((node) => {
        if (node.type === 'function' && node.value === 'var' && node.nodes) {
            const varName = node.nodes[0];
            if (!validateAllowedNodesUntil(node, 1)) {
                const args = postcssValueParser.stringify(node.nodes);
                context.diagnostics.warn(decl, diagnostics.ILLEGAL_CSS_VAR_ARGS(args), {
                    word: args,
                });
            }

            addCSSVar(context, postcssValueParser.stringify(varName).trim(), decl, false);
        }
    });
}

function addCSSVarDefinition(context: FeatureContext, node: postcss.Declaration | postcss.AtRule) {
    let varName = node.type === 'atrule' ? node.params.trim() : node.prop.trim();
    let isGlobal = false;

    const globalVarName = globalValue(varName);

    if (globalVarName !== undefined) {
        varName = globalVarName.trim();
        isGlobal = true;
    }

    if (node.type === 'atrule' && STSymbol.get(context.meta, varName)) {
        context.diagnostics.warn(node, STSymbol.diagnostics.REDECLARE_SYMBOL(varName), {
            word: varName,
        });
    }

    addCSSVar(context, varName, node, isGlobal);
}

function addCSSVar(
    context: FeatureContext,
    varName: string,
    node: postcss.Declaration | postcss.AtRule,
    global: boolean
) {
    if (isCSSVarProp(varName)) {
        if (!context.meta.cssVars[varName]) {
            const cssVarSymbol: CSSVarSymbol = {
                _kind: 'cssVar',
                name: varName,
                global,
            };
            context.meta.cssVars[varName] = cssVarSymbol;
            const prevSymbol = STSymbol.get(context.meta, varName);
            const override = node.type === `atrule` || !prevSymbol;
            if (override) {
                STSymbol.addSymbol({
                    context,
                    symbol: cssVarSymbol,
                    safeRedeclare: true,
                });
            }
        }
    } else {
        context.diagnostics.warn(node, diagnostics.ILLEGAL_CSS_VAR_USE(varName), {
            word: varName,
        });
    }
}
