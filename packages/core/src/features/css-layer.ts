import { createFeature, FeatureContext } from './feature';
import * as STSymbol from './st-symbol';
import * as STImport from './st-import';
import type { StylableMeta } from '../stylable-meta';
import { plugableRecord } from '../helpers/plugable-record';
import { namespace } from '../helpers/namespace';
import { globalValueFromFunctionNode, GLOBAL_FUNC } from '../helpers/global';
import { CSSWideKeywords } from '../native-reserved-lists';
import valueParser from 'postcss-value-parser';
import type * as postcss from 'postcss';
import type { Diagnostics } from '../diagnostics';

export interface LayerSymbol {
    _kind: 'layer';
    name: string;
    alias: string;
    global?: boolean;
    import?: STImport.Imported;
}
export interface ResolvedLayer {
    meta: StylableMeta;
    symbol: LayerSymbol;
}

export const diagnostics = {
    MISSING_LAYER_NAME_INSIDE_GLOBAL() {
        return `"@layer" missing parameter inside "${GLOBAL_FUNC}()"`;
    },
    LAYER_SORT_STATEMENT_WITH_STYLE() {
        return `"@layer" ordering statement cannot have a style block`;
    },
    RESERVED_KEYWORD(name: string) {
        return `"@layer" name cannot be reserved word "${name}"`;
    },
    NOT_IDENT(name: string) {
        return `"@layer" expected ident, but got "${name}"`;
    },
    UNKNOWN_IMPORTED_LAYER(name: string, path: string) {
        return `cannot resolve imported layer "${name}" from stylesheet "${path}"`;
    },
};

const dataKey = plugableRecord.key<{
    analyzedParams: Record<
        string,
        {
            names: string[];
            transformNames: (mappedNames: Record<string, string>) => string;
        }
    >;
}>('layer');

// HOOKS

STImport.ImportTypeHook.set(`layer`, (context, localName, importName, importDef) => {
    addLayer({
        context,
        name: localName,
        importName,
        ast: importDef.rule,
        global: false,
        importDef,
    });
});

export const hooks = createFeature<{
    RESOLVED: Record<string, ResolvedLayer>;
}>({
    metaInit({ meta }) {
        plugableRecord.set(meta.data, dataKey, { analyzedParams: {} });
    },
    analyzeAtRule({ context, atRule }) {
        if (atRule.name !== 'layer' || !atRule.params) {
            return;
        }
        const analyzeMetaData = plugableRecord.getUnsafe(context.meta.data, dataKey);
        const analyzedParams = parseLayerParams(atRule.params, context.diagnostics, atRule);
        if (analyzedParams.multiple && atRule.nodes) {
            context.diagnostics.error(atRule, diagnostics.LAYER_SORT_STATEMENT_WITH_STYLE());
        }
        // cache params
        analyzeMetaData.analyzedParams[atRule.params] = analyzedParams;
        // cache symbols
        for (const name of analyzedParams.names) {
            addLayer({
                context,
                name,
                importName: name,
                global: !!analyzedParams.globals[name],
                ast: atRule,
            });
        }
    },
    transformResolve({ context }) {
        const symbols = STSymbol.getAllByType(context.meta, `layer`);
        const resolved: Record<string, ResolvedLayer> = {};
        const resolvedSymbols = context.getResolvedSymbols(context.meta);
        for (const [name, symbol] of Object.entries(symbols)) {
            const res = resolvedSymbols.layer[name];
            if (res) {
                resolved[name] = res;
            } else if (symbol.import) {
                context.diagnostics.error(
                    symbol.import.rule,
                    diagnostics.UNKNOWN_IMPORTED_LAYER(symbol.name, symbol.import.request),
                    {
                        word: symbol.name,
                    }
                );
            }
        }
        return resolved;
    },
    transformAtRuleNode({ context, atRule, resolved }) {
        if (atRule.name !== 'layer' || !atRule.params) {
            return;
        }
        const { analyzedParams } = plugableRecord.getUnsafe(context.meta.data, dataKey);
        const analyzed = analyzedParams[atRule.params];
        if (analyzed) {
            atRule.params = analyzed.transformNames(
                analyzed.names.reduce((mapped, name) => {
                    const resolve = resolved[name];
                    mapped[name] = resolve ? getTransformedName(resolved[name]) : name;
                    return mapped;
                }, {} as Record<string, string>)
            );
        }
    },
    transformJSExports({ exports, resolved }) {
        for (const [name, resolve] of Object.entries(resolved)) {
            exports.layers[name] = getTransformedName(resolve);
        }
    },
});

// API

export function get(meta: StylableMeta, name: string): LayerSymbol | undefined {
    return STSymbol.get(meta, name, `layer`);
}
export function getAll(meta: StylableMeta): Record<string, LayerSymbol> {
    return STSymbol.getAllByType(meta, `layer`);
}

function parseLayerParams(params: string, report: Diagnostics, atRule: postcss.AtRule) {
    const names: string[] = [];
    const globals: Record<string, true> = {};
    let readyForName = true;
    let multiple = false;
    const ast = valueParser(params).nodes;
    const namedNodeRefs: Record<string, valueParser.Node> = {};
    for (let i = 0; i < ast.length; ++i) {
        const node = ast[i];
        const { type, value } = node;
        if (type === 'word') {
            if (readyForName) {
                const layers: valueParser.WordNode[] = [];
                for (const name of value.split('.')) {
                    // ToDo: handle name duplications
                    const splittedLayer = { ...node, value: name };
                    if (layers.length) {
                        layers.push({ ...node, value: '.' });
                    }
                    layers.push(splittedLayer);
                    namedNodeRefs[name] = splittedLayer;
                    names.push(name);
                    readyForName = false;
                }
                ast.splice(i, 1, ...layers);
            }
        } else if (type === 'function' && value === GLOBAL_FUNC && readyForName) {
            const globalName = globalValueFromFunctionNode(node);
            if (globalName) {
                namedNodeRefs[globalName] = node;
                names.push(globalName);
                globals[globalName] = true;
            } else if (globalName === '') {
                report.warn(atRule, diagnostics.MISSING_LAYER_NAME_INSIDE_GLOBAL());
            }
            readyForName = false;
        } else if (type === 'div' && value === ',') {
            readyForName = true;
            multiple = true;
        } else if (type === 'comment') {
            // doesn't change meaning: do nothing
        } else {
            readyForName = false;
            const source = valueParser.stringify(node);
            report.error(atRule, diagnostics.NOT_IDENT(source), { word: source });
        }
    }
    return {
        names,
        globals,
        multiple,
        transformNames(mappedNames: Record<string, string>) {
            for (const [srcName, targetName] of Object.entries(mappedNames)) {
                const modifiedNode = namedNodeRefs[srcName];
                if (modifiedNode.type === 'function') {
                    // mutate to word - this is safe since this node is not exposed
                    (modifiedNode as any).type = 'word';
                }
                modifiedNode.value = targetName;
            }
            return valueParser.stringify(ast);
        },
    };
}

function getTransformedName({ symbol, meta }: ResolvedLayer) {
    return symbol.global ? symbol.alias : namespace(symbol.alias, meta.namespace);
}

function addLayer({
    context,
    name,
    importName,
    ast,
    global,
    importDef,
}: {
    context: FeatureContext;
    name: string;
    importName: string;
    ast: postcss.AtRule | postcss.Rule;
    global: boolean;
    importDef?: STImport.Imported;
}) {
    const definedSymbol = STSymbol.get(context.meta, name, 'layer');
    if (!definedSymbol) {
        if (CSSWideKeywords.includes(name)) {
            // keep
            global = true;
            context.diagnostics.error(ast, diagnostics.RESERVED_KEYWORD(name), { word: name });
        }
        STSymbol.addSymbol({
            context,
            node: ast,
            localName: name,
            symbol: {
                _kind: 'layer',
                name: importName,
                alias: name,
                global,
                import: importDef,
            },
            safeRedeclare: false,
        });
    }
}
