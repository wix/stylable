import { createFeature, FeatureContext } from './feature';
import * as STSymbol from './st-symbol';
import {
    validateAtProperty,
    isCSSVarProp,
    generateScopedCSSVar,
    getScopedCSSVar,
} from '../helpers/css-custom-property';
import { validateAllowedNodesUntil, stringifyFunction } from '../helpers/value';
import { globalValue, GLOBAL_FUNC } from '../helpers/global';
import type { StylableMeta } from '../stylable-meta';
import type { StylableResolver } from '../stylable-resolver';
import type * as postcss from 'postcss';
// ToDo: refactor out
import postcssValueParser from 'postcss-value-parser';

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
    DEPRECATED_ST_GLOBAL_CUSTOM_PROPERTY() {
        return `"st-global-custom-property" is deprecated and will be removed in the next version. Use "@property" with ${GLOBAL_FUNC}`;
    },
    GLOBAL_CSS_VAR_MISSING_COMMA(name: string) {
        return `"@st-global-custom-property" received the value "${name}", but its values must be comma separated`;
    },
    ILLEGAL_GLOBAL_CSS_VAR(name: string) {
        return `"@st-global-custom-property" received the value "${name}", but it must begin with "--" (double-dash)`;
    },
};

// HOOKS

export const hooks = createFeature<{
    RESOLVED: Record<string, string>;
}>({
    analyzeAtRule({ context, atRule, toRemove }) {
        if (atRule.name === `property`) {
            addCSSVarDefinition(context, atRule);
            validateAtProperty(atRule, context.diagnostics);
        } else if (atRule.name === `st-global-custom-property`) {
            analyzeDeprecatedStGlobalCustomProperty(context, atRule);
            toRemove.push(atRule);
        }
    },
    analyzeDeclaration({ context, decl }) {
        if (isCSSVarProp(decl.prop)) {
            addCSSVarDefinition(context, decl);
        }
        if (decl.value.includes('var(')) {
            handleCSSVarUse(context, decl);
        }
    },
    transformResolve({ context: { meta, resolver } }) {
        const cssVarsMapping: Record<string, string> = {};
        // imported vars
        for (const imported of meta.getImportStatements()) {
            for (const symbolName of Object.keys(imported.named)) {
                if (isCSSVarProp(symbolName)) {
                    const importedVar = resolver.deepResolve(STSymbol.get(meta, symbolName));

                    if (
                        importedVar &&
                        importedVar._kind === 'css' &&
                        importedVar.symbol &&
                        importedVar.symbol._kind === 'cssVar'
                    ) {
                        cssVarsMapping[symbolName] = importedVar.symbol.global
                            ? importedVar.symbol.name
                            : generateScopedCSSVar(
                                  importedVar.meta.namespace,
                                  importedVar.symbol.name.slice(2)
                              );
                    }
                }
            }
        }

        // locally defined vars
        for (const localVarName of Object.keys(meta.cssVars)) {
            const cssVar = meta.cssVars[localVarName];

            if (!cssVarsMapping[localVarName]) {
                cssVarsMapping[localVarName] = cssVar.global
                    ? localVarName
                    : generateScopedCSSVar(meta.namespace, localVarName.slice(2));
            }
        }

        return cssVarsMapping;
    },
    transformAtRuleNode({ atRule, resolved }) {
        if (atRule.nodes?.length) {
            // ToDo: namespace
            atRule.params = resolved[atRule.params] ?? atRule.params;
        } else {
            // remove `@property` with no body
            atRule.remove();
        }
        // ToDo: move removal of `@st-global-custom-property` here
    },
    transformDeclaration({ decl, context, resolved }) {
        decl.prop = getScopedCSSVar(decl, context.meta, resolved);
    },
    transformDeclarationValue({ node, resolved }) {
        const { value } = node;
        const varWithPrefix = node.nodes[0].value;
        if (isCSSVarProp(varWithPrefix)) {
            if (resolved && resolved[varWithPrefix]) {
                node.nodes[0].value = resolved[varWithPrefix];
            }
        }
        // handle default values
        if (node.nodes.length > 2) {
            node.resolvedValue = stringifyFunction(value, node);
        }
    },
    transformJSExports({ exports, resolved }) {
        for (const varName of Object.keys(resolved)) {
            // ToDo: namespace
            exports.vars[varName.slice(2)] = resolved[varName];
        }
    },
});

// API

export function get(meta: StylableMeta, name: string): CSSVarSymbol | undefined {
    // return STSymbol.get(meta, name, `class`);
    return meta.cssVars[name];
}

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

function analyzeDeprecatedStGlobalCustomProperty(context: FeatureContext, atRule: postcss.AtRule) {
    // report deprecation
    context.diagnostics.info(atRule, diagnostics.DEPRECATED_ST_GLOBAL_CUSTOM_PROPERTY());
    //
    const cssVarsByComma = atRule.params.split(',');
    const cssVarsBySpacing = atRule.params
        .trim()
        .split(/\s+/g)
        .filter((s) => s !== ',');

    if (cssVarsBySpacing.length > cssVarsByComma.length) {
        context.diagnostics.warn(atRule, diagnostics.GLOBAL_CSS_VAR_MISSING_COMMA(atRule.params), {
            word: atRule.params,
        });
        return;
    }

    for (const entry of cssVarsByComma) {
        const cssVar = entry.trim();
        if (isCSSVarProp(cssVar)) {
            const property: CSSVarSymbol = {
                _kind: 'cssVar',
                name: cssVar,
                global: true,
            };
            context.meta.cssVars[cssVar] = property;
            STSymbol.addSymbol({
                context,
                symbol: property,
                node: atRule,
            });
        } else {
            context.diagnostics.warn(atRule, diagnostics.ILLEGAL_GLOBAL_CSS_VAR(cssVar), {
                word: cssVar,
            });
        }
    }
}

export function scopeCSSVar(resolver: StylableResolver, meta: StylableMeta, symbolName: string) {
    const importedVar = resolver.deepResolve(STSymbol.get(meta, symbolName));
    if (
        importedVar &&
        importedVar._kind === 'css' &&
        importedVar.symbol &&
        importedVar.symbol._kind === 'cssVar'
    ) {
        return importedVar.symbol.global
            ? importedVar.symbol.name
            : generateScopedCSSVar(importedVar.meta.namespace, importedVar.symbol.name.slice(2));
    }
    const cssVar = meta.cssVars[symbolName];
    if (cssVar?.global) {
        return symbolName;
    } else {
        return generateScopedCSSVar(meta.namespace, symbolName.slice(2));
    }
}
