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
import { createDiagnosticReporter } from '../diagnostics';
import type { StylableMeta } from '../stylable-meta';
import type { StylableResolver, CSSResolve } from '../stylable-resolver';
import type * as postcss from 'postcss';
// ToDo: refactor out - parse once and pass to hooks
import postcssValueParser from 'postcss-value-parser';
export interface CSSVarSymbol {
    _kind: 'cssVar';
    name: string;
    global: boolean;
    alias: ImportSymbol | undefined;
}

export const diagnostics = {
    ...atPropertyValidationWarnings,
    ILLEGAL_CSS_VAR_USE: createDiagnosticReporter(
        '01005',
        'error',
        (name: string) =>
            `a custom css property must begin with "--" (double-dash), but received "${name}"`
    ),
    ILLEGAL_CSS_VAR_ARGS: createDiagnosticReporter(
        '01006',
        'error',
        (name: string) =>
            `custom property "${name}" usage (var()) must receive comma separated values`
    ),
    DEPRECATED_ST_GLOBAL_CUSTOM_PROPERTY: createDiagnosticReporter(
        '01007',
        'info',
        () =>
            `"st-global-custom-property" is deprecated and will be removed in the next version. Use "@property" with ${GLOBAL_FUNC}`
    ),
    GLOBAL_CSS_VAR_MISSING_COMMA: createDiagnosticReporter(
        '01008',
        'error',
        (name: string) =>
            `"@st-global-custom-property" received the value "${name}", but its values must be comma separated`
    ),
    ILLEGAL_GLOBAL_CSS_VAR: createDiagnosticReporter(
        '01009',
        'error',
        (name: string) =>
            `"@st-global-custom-property" received the value "${name}", but it must begin with "--" (double-dash)`
    ),
    MISSING_PROP_NAME: createDiagnosticReporter(
        '01010',
        'error',
        () => `missing custom property name for "var(--[PROP NAME])"`
    ),
    UNDEFINED_CSS_CUSTOM_PROP: createDiagnosticReporter(
        '01011',
        'error',
        (name) =>
            `Undefined "${name}" custom property. Please define the property using '@property' or import it with '@st-import' when 'strictCustomProperty' is enabled.`
    ),
};

const dataKey = plugableRecord.key<{
    stCustomGlobalProperty: Record<string, CSSVarSymbol>;
    typedDefinitions: Record<string, postcss.AtRule[]>;
}>('custom-property');

// HOOKS

export const hooks = createFeature<{
    RESOLVED: Record<string, string>;
}>({
    metaInit({ meta }) {
        plugableRecord.set(meta.data, dataKey, {
            stCustomGlobalProperty: {},
            typedDefinitions: {},
        });
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
    analyzeAtRule({ context, atRule }) {
        const isStylable = context.meta.type === 'stylable';
        if (atRule.name === `property`) {
            let name = atRule.params;
            let global = !isStylable;
            // check global
            const globalVarName = isStylable ? globalValue(name) : undefined;
            if (globalVarName !== undefined) {
                name = globalVarName.trim();
                global = true;
            }
            const { stCustomGlobalProperty, typedDefinitions } = plugableRecord.getUnsafe(
                context.meta.data,
                dataKey
            );
            // handle conflict with deprecated `@st-global-custom-property`
            if (stCustomGlobalProperty[name]) {
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
            // save reference to runtime definitions
            if (atRule.nodes) {
                typedDefinitions[name] ??= [];
                typedDefinitions[name].push(atRule);
            }
        } else if (atRule.name === `st-global-custom-property` && isStylable) {
            analyzeDeprecatedStGlobalCustomProperty(context, atRule);
        }
    },
    analyzeDeclaration({ context, decl }) {
        // register prop
        if (validateCustomPropertyName(decl.prop)) {
            addCSSProperty({
                context,
                node: decl,
                name: decl.prop,
                global: context.meta.type === 'css',
                final: false,
            });
        }
        // register value
        if (decl.value.includes('var(')) {
            analyzeDeclValueVarCalls(context, decl);
        }
    },
    prepareAST({ context, node, toRemove }) {
        if (
            node.type === `atrule` &&
            node.name === 'st-global-custom-property' &&
            context.meta.type === 'stylable'
        ) {
            toRemove.push(node);
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
    transformAtRuleNode({ context, atRule, resolved }) {
        if (atRule.name !== `property`) {
            return;
        }

        if (atRule.nodes?.length) {
            const propName = globalValue(atRule.params) || atRule.params;
            if (resolved[propName]) {
                atRule.params = resolved[propName] || atRule.params;
            }
        } else if (context.meta.type === 'stylable') {
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
    if (!final) {
        const existing = STSymbol.get(context.meta, name, `cssVar`);
        if (existing) {
            // already defined
            return;
            // eslint-disable-next-line no-constant-condition
        } else if (context.meta.type === 'stylable' && context.meta.flags.strictCustomProperty) {
            // strict mode
            context.diagnostics.report(diagnostics.UNDEFINED_CSS_CUSTOM_PROP(name), {
                node,
                word: name,
            });
        }
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
                global: context.meta.type === 'css',
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

export function getRuntimeTypedDefinitionNames(meta: StylableMeta) {
    const { typedDefinitions } = plugableRecord.getUnsafe(meta.data, dataKey);
    return Object.keys(typedDefinitions);
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
