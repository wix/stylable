import { createFeature, FeatureContext } from './feature';
import * as STSymbol from './st-symbol';
import type { ImportSymbol } from './st-import';
import {
    validateAtProperty,
    validateCustomPropertyName,
    generateScopedCSSVar,
    atPropertyValidationWarnings,
} from '../helpers/css-custom-property';
import { validateAllowedNodesUntil, stringifyFunction } from '../helpers/value';
import { globalValue, GLOBAL_FUNC } from '../helpers/global';
import { plugableRecord } from '../helpers/plugable-record';
import type { StylableMeta } from '../stylable-meta';
import type { StylableResolver, CSSResolve } from '../stylable-resolver';
import type * as postcss from 'postcss';
// ToDo: refactor out - parse once and pass to hooks
import postcssValueParser from 'postcss-value-parser';
import type { DiagnosticBase } from '../diagnostics';
export interface CSSVarSymbol {
    _kind: 'cssVar';
    name: string;
    global: boolean;
    alias: ImportSymbol | undefined;
}

export const diagnostics = {
    ...atPropertyValidationWarnings,
    ILLEGAL_CSS_VAR_USE(name: string): DiagnosticBase {
        return {
            code: '01005',
            message: `a custom css property must begin with "--" (double-dash), but received "${name}"`,
            severity: 'error',
        };
    },
    ILLEGAL_CSS_VAR_ARGS(name: string): DiagnosticBase {
        return {
            code: '01006',
            message: `custom property "${name}" usage (var()) must receive comma separated values`,
            severity: 'error',
        };
    },
    DEPRECATED_ST_GLOBAL_CUSTOM_PROPERTY(): DiagnosticBase {
        return {
            code: '01007',
            message: `"st-global-custom-property" is deprecated and will be removed in the next version. Use "@property" with ${GLOBAL_FUNC}`,
            severity: 'info',
        };
    },
    GLOBAL_CSS_VAR_MISSING_COMMA(name: string): DiagnosticBase {
        return {
            code: '01008',
            message: `"@st-global-custom-property" received the value "${name}", but its values must be comma separated`,
            severity: 'error',
        };
    },
    ILLEGAL_GLOBAL_CSS_VAR(name: string): DiagnosticBase {
        return {
            code: '01009',
            message: `"@st-global-custom-property" received the value "${name}", but it must begin with "--" (double-dash)`,
            severity: 'error',
        };
    },
    MISSING_PROP_NAME(): DiagnosticBase {
        return {
            code: '01010',
            message: `missing custom property name for "var(--[PROP NAME])"`,
            severity: 'error',
        };
    },
};

const dataKey = plugableRecord.key<{
    stCustomGlobalProperty: Record<string, CSSVarSymbol>;
}>('custom-property');

// HOOKS

export const hooks = createFeature<{
    RESOLVED: Record<string, string>;
}>({
    metaInit({ meta }) {
        plugableRecord.set(meta.data, dataKey, { stCustomGlobalProperty: {} });
    },
    analyzeInit(context) {
        // ToDo: move to `STImport.ImportTypeHook`
        for (const [symbolName, symbol] of Object.entries(
            STSymbol.getAllByType(context.meta, `import`)
        )) {
            if (validateCustomPropertyName(symbolName)) {
                const importSymbol = STSymbol.get(context.meta, symbolName, `import`);
                if (!importSymbol) {
                    console.warn(
                        `imported symbol "${symbolName}" not found on "${context.meta.source}"`
                    );
                    continue;
                }
                addCSSProperty({
                    context,
                    node: symbol.import.rule,
                    name: symbolName,
                    global: false,
                    final: true,
                    alias: importSymbol,
                });
            }
        }
    },
    analyzeAtRule({ context, atRule, toRemove }) {
        if (atRule.name === `property`) {
            let name = atRule.params;
            let global = false;
            // check global
            const globalVarName = globalValue(name);
            if (globalVarName !== undefined) {
                name = globalVarName.trim();
                global = true;
            }
            // handle conflict with deprecated `@st-global-custom-property`
            if (plugableRecord.getUnsafe(context.meta.data, dataKey).stCustomGlobalProperty[name]) {
                global = true;
            }
            addCSSProperty({
                context,
                node: atRule,
                name,
                global,
                final: true,
            });
            validateAtProperty(atRule, context.diagnostics);
        } else if (atRule.name === `st-global-custom-property`) {
            analyzeDeprecatedStGlobalCustomProperty(context, atRule);
            toRemove.push(atRule); // ToDo: move to transform
        }
    },
    analyzeDeclaration({ context, decl }) {
        // register prop
        if (validateCustomPropertyName(decl.prop)) {
            addCSSProperty({
                context,
                node: decl,
                name: decl.prop,
                global: false,
                final: false,
            });
        }
        // register value
        if (decl.value.includes('var(')) {
            analyzeDeclValueVarCalls(context, decl);
        }
    },
    transformResolve({ context: { meta, getResolvedSymbols } }) {
        const customPropsMapping: Record<string, string> = {};
        const resolvedSymbols = getResolvedSymbols(meta);
        for (const [localVarName, localSymbol] of Object.entries(
            STSymbol.getAllByType(meta, `cssVar`)
        )) {
            const resolve = resolvedSymbols.cssVar[localVarName] || {
                // fallback to local namespace
                _kind: `css`,
                symbol: localSymbol,
                meta,
            };
            customPropsMapping[localVarName] = getTransformedName(resolve);
        }

        return customPropsMapping;
    },
    transformAtRuleNode({ atRule, resolved }) {
        if (atRule.name !== `property`) {
            return;
        }

        if (atRule.nodes?.length) {
            if (resolved[atRule.params]) {
                atRule.params = resolved[atRule.params] || atRule.params;
            }
        } else {
            // remove `@property` with no body
            atRule.remove();
        }
    },
    transformDeclaration({ decl, resolved }) {
        decl.prop = resolved[decl.prop] || decl.prop;
    },
    transformValue({ node, data: { cssVarsMapping } }) {
        const { value } = node;
        const varWithPrefix = node.nodes[0]?.value || ``;
        if (validateCustomPropertyName(varWithPrefix)) {
            if (cssVarsMapping && cssVarsMapping[varWithPrefix]) {
                node.nodes[0].value = cssVarsMapping[varWithPrefix];
            }
        }
        // handle default values - ToDo: check if required
        if (node.nodes.length > 2) {
            node.resolvedValue = stringifyFunction(value, node);
        }
    },
    transformJSExports({ exports, resolved }) {
        for (const varName of Object.keys(resolved)) {
            exports.vars[varName.slice(2)] = resolved[varName];
        }
    },
});

// API

export function get(meta: StylableMeta, name: string): CSSVarSymbol | undefined {
    return STSymbol.get(meta, name, `cssVar`);
}

function addCSSProperty({
    context,
    node,
    name,
    global,
    final,
    alias,
}: {
    context: FeatureContext;
    node: postcss.Declaration | postcss.AtRule | postcss.Rule;
    name: string;
    global: boolean;
    final: boolean;
    alias?: ImportSymbol;
}) {
    // validate indent
    if (!validateCustomPropertyName(name)) {
        context.diagnostics.report(diagnostics.ILLEGAL_CSS_VAR_USE(name), {
            node,
            word: name,
        });
        return;
    }
    // usages bailout: addition of weak definition reference `--x: var(--x)`
    if (!final && !!STSymbol.get(context.meta, name, `cssVar`)) {
        return;
    }

    // define symbol
    STSymbol.addSymbol({
        context,
        symbol: {
            _kind: 'cssVar',
            name: name,
            global,
            alias,
        },
        safeRedeclare: !final || !!alias,
        node,
    });
}

function analyzeDeclValueVarCalls(context: FeatureContext, decl: postcss.Declaration) {
    const parsed = postcssValueParser(decl.value);
    parsed.walk((node) => {
        if (node.type === 'function' && node.value === 'var' && node.nodes) {
            const varName = node.nodes[0];
            if (!varName) {
                context.diagnostics.report(diagnostics.MISSING_PROP_NAME(), {
                    node: decl,
                });
                return;
            }

            if (!validateAllowedNodesUntil(node, 1)) {
                const args = postcssValueParser.stringify(node.nodes);
                context.diagnostics.report(diagnostics.ILLEGAL_CSS_VAR_ARGS(args), {
                    node: decl,
                    word: args,
                });
            }

            addCSSProperty({
                context,
                name: postcssValueParser.stringify(varName)?.trim() || ``,
                node: decl,
                global: false,
                final: false,
            });
        }
    });
}

function analyzeDeprecatedStGlobalCustomProperty(context: FeatureContext, atRule: postcss.AtRule) {
    // report deprecation
    context.diagnostics.report(diagnostics.DEPRECATED_ST_GLOBAL_CUSTOM_PROPERTY(), {
        node: atRule,
    });
    //
    const cssVarsByComma = atRule.params.split(',');
    const cssVarsBySpacing = atRule.params
        .trim()
        .split(/\s+/g)
        .filter((s) => s !== ',');

    if (cssVarsBySpacing.length > cssVarsByComma.length) {
        context.diagnostics.report(diagnostics.GLOBAL_CSS_VAR_MISSING_COMMA(atRule.params), {
            node: atRule,
            word: atRule.params,
        });
        return;
    }

    for (const entry of cssVarsByComma) {
        const name = entry.trim();
        if (validateCustomPropertyName(name)) {
            // ToDo: change to modify global instead of override
            addCSSProperty({
                context,
                node: atRule,
                name,
                global: true,
                final: true,
            });
            // keep track of defined props through `@st-custom-global-property` in order
            // to not override the default with following `@property` definitions
            const { stCustomGlobalProperty } = plugableRecord.getUnsafe(context.meta.data, dataKey);
            stCustomGlobalProperty[name] = STSymbol.get(context.meta, name, `cssVar`)!;
        } else {
            context.diagnostics.report(diagnostics.ILLEGAL_GLOBAL_CSS_VAR(name), {
                node: atRule,
                word: name,
            });
        }
    }
}
export function getTransformedName({ symbol, meta }: CSSResolve<CSSVarSymbol>) {
    return symbol.global ? symbol.name : generateScopedCSSVar(meta.namespace, symbol.name.slice(2));
}

export function scopeCSSVar(resolver: StylableResolver, meta: StylableMeta, symbolName: string) {
    const importedVar = resolver.deepResolve(STSymbol.get(meta, symbolName));
    if (
        importedVar &&
        importedVar._kind === 'css' &&
        importedVar.symbol &&
        importedVar.symbol._kind === 'cssVar'
    ) {
        importedVar;
        return getTransformedName(importedVar as CSSResolve<CSSVarSymbol>);
    }
    const cssVar = STSymbol.get(meta, symbolName, `cssVar`);
    return cssVar?.global ? symbolName : generateScopedCSSVar(meta.namespace, symbolName.slice(2));
}
