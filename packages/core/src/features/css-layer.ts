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
import { createDiagnosticReporter, Diagnostics } from '../diagnostics';

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
    MISSING_LAYER_NAME_INSIDE_GLOBAL: createDiagnosticReporter(
        '19001',
        'warning',
        () => `"@layer" missing parameter inside "${GLOBAL_FUNC}()"`
    ),
    LAYER_SORT_STATEMENT_WITH_STYLE: createDiagnosticReporter(
        '19002',
        'error',
        () => `"@layer" ordering statement cannot have a style block`
    ),
    RESERVED_KEYWORD: createDiagnosticReporter(
        '19003',
        'error',
        (name: string) => `"@layer" name cannot be reserved word "${name}"`
    ),
    NOT_IDENT: createDiagnosticReporter(
        '19004',
        'error',
        (name: string) => `"@layer" expected ident, but got "${name}"`
    ),
    RECONFIGURE_IMPORTED: createDiagnosticReporter(
        '19005',
        'error',
        (name: string) => `cannot reconfigure imported layer "${name}"`
    ),
    UNKNOWN_IMPORTED_LAYER: createDiagnosticReporter(
        '19006',
        'error',
        (name: string, path: string) =>
            `cannot resolve imported layer "${name}" from stylesheet "${path}"`
    ),
};

const dataKey = plugableRecord.key<{
    analyzedParams: Record<
        string,
        {
            names: string[];
            transformNames: (getTransformedName: (name: string) => string) => string;
        }
    >;
    layerDefs: Record<string, postcss.AtRule | postcss.Rule>;
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
        plugableRecord.set(meta.data, dataKey, { analyzedParams: {}, layerDefs: {} });
    },
    analyzeAtRule({ context, atRule }) {
        if (!atRule.params) {
            return;
        }
        if (atRule.name === 'import') {
            // native css import
            analyzeCSSImportLayer(context, atRule);
        } else if (atRule.name === 'layer') {
            // layer atrule
            const analyzeMetaData = plugableRecord.getUnsafe(context.meta.data, dataKey);
            const analyzedParams = parseLayerParams(
                atRule.params,
                context.diagnostics,
                atRule,
                context.meta.type === 'stylable'
            );
            if (analyzedParams.multiple && atRule.nodes) {
                context.diagnostics.report(diagnostics.LAYER_SORT_STATEMENT_WITH_STYLE(), {
                    node: atRule,
                });
            }
            // cache params
            analyzeMetaData.analyzedParams[atRule.params] = analyzedParams;
            // cache symbols
            for (const name of analyzedParams.names) {
                addLayer({
                    context,
                    name,
                    importName: name,
                    global: !!analyzedParams.globals[name] || context.meta.type === 'css',
                    ast: atRule,
                });
            }
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
                context.diagnostics.report(
                    diagnostics.UNKNOWN_IMPORTED_LAYER(symbol.name, symbol.import.request),
                    {
                        node: symbol.import.rule,
                        word: symbol.name,
                    }
                );
            }
        }
        return resolved;
    },
    transformAtRuleNode({ context, atRule, resolved }) {
        if (!atRule.params) {
            return;
        }
        if (atRule.name === 'import') {
            // native css import
            transformCSSImportLayer(context, atRule, resolved);
        } else if (atRule.name === 'layer') {
            // layer atrule
            const { analyzedParams } = plugableRecord.getUnsafe(context.meta.data, dataKey);
            const analyzed = analyzedParams[atRule.params];
            if (analyzed) {
                atRule.params = analyzed.transformNames((name) => {
                    const resolve = resolved[name];
                    return resolve ? getTransformedName(resolved[name]) : name;
                });
            }
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
export function getDefinition(
    meta: StylableMeta,
    name: string
): postcss.AtRule | postcss.Rule | undefined {
    const analyzeMetaData = plugableRecord.getUnsafe(meta.data, dataKey);
    return analyzeMetaData.layerDefs[name];
}

function parseLayerParams(
    params: string,
    report: Diagnostics,
    atRule: postcss.AtRule,
    isStylable: boolean
) {
    const names: string[] = [];
    const globals: Record<string, true> = {};
    let readyForName = true;
    let multiple = false;
    const ast = valueParser(params).nodes;
    const namedNodeRefs: Record<string, valueParser.Node[]> = {};
    for (let i = 0; i < ast.length; ++i) {
        const node = ast[i];
        const { type, value } = node;
        if (type === 'word') {
            if (readyForName) {
                const layers: valueParser.WordNode[] = [];
                for (const name of getDotSeparatedNames(value)) {
                    // ToDo: handle name duplications
                    const splittedLayer = { ...node, value: name };
                    if (layers.length) {
                        layers.push({ ...node, value: '.' });
                    }
                    layers.push(splittedLayer);
                    namedNodeRefs[name] ??= [];
                    namedNodeRefs[name].push(splittedLayer);
                    names.push(name);
                }
                readyForName = false;
                ast.splice(i, 1, ...layers);
            }
        } else if (type === 'function' && value === GLOBAL_FUNC && readyForName && isStylable) {
            const globalName = globalValueFromFunctionNode(node);
            if (globalName) {
                namedNodeRefs[globalName] ??= [];
                namedNodeRefs[globalName].push(node);
                names.push(globalName);
                globals[globalName] = true;
            } else if (globalName === '') {
                report.report(diagnostics.MISSING_LAYER_NAME_INSIDE_GLOBAL(), { node: atRule });
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
            report.report(diagnostics.NOT_IDENT(source), { node: atRule, word: source });
        }
    }
    return {
        names,
        globals,
        multiple,
        transformNames(getTransformedName: (name: string) => string) {
            for (const [name, nodes] of Object.entries(namedNodeRefs)) {
                const transformedName = getTransformedName(name);
                for (const modifiedNode of nodes) {
                    if (modifiedNode.type === 'function') {
                        // mutate to word - this is safe since this node is not exposed
                        (modifiedNode as any).type = 'word';
                    }
                    modifiedNode.value = transformedName;
                }
            }
            return valueParser.stringify(ast);
        },
    };
}

function getDotSeparatedNames(value: string) {
    if (!value.includes('.')) {
        return [value];
    }
    const names = [];
    let lastIndex = 0;
    for (let index = 0; index < value.length; ++index) {
        const char = value[index];
        switch (char) {
            case '.': {
                if (value[index - 1] !== '\\') {
                    names.push(value.substring(lastIndex, index));
                    lastIndex = index + 1;
                }
                break;
            }
        }
    }
    if (lastIndex <= value.length - 1) {
        names.push(value.substring(lastIndex, value.length));
    }
    return names;
}

function analyzeCSSImportLayer(context: FeatureContext, importAtRule: postcss.AtRule) {
    const ast = valueParser(importAtRule.params).nodes;
    for (let i = 0; i < ast.length; ++i) {
        const node = ast[i];
        const { type, value } = node;
        if (type === 'function' && value === 'layer' && node.nodes.length) {
            for (const nestedNode of node.nodes) {
                if (nestedNode.type === 'word') {
                    for (const name of getDotSeparatedNames(nestedNode.value)) {
                        addLayer({
                            context,
                            name,
                            importName: name,
                            ast: importAtRule,
                            global: false,
                        });
                    }
                }
            }
        }
    }
}
function transformCSSImportLayer(
    _context: FeatureContext,
    importAtRule: postcss.AtRule,
    resolved: Record<string, ResolvedLayer>
) {
    const ast = valueParser(importAtRule.params).nodes;
    for (let i = 0; i < ast.length; ++i) {
        const node = ast[i];
        const { type, value } = node;
        if (type === 'function' && value === 'layer' && node.nodes.length) {
            for (const nestedNode of node.nodes) {
                const { type, value } = nestedNode;
                if (type === 'word') {
                    nestedNode.value = getDotSeparatedNames(value)
                        .map((name) => {
                            const resolve = resolved[name];
                            return resolve ? getTransformedName(resolved[name]) : name;
                        })
                        .join('.');
                }
            }
        }
    }
    importAtRule.params = valueParser.stringify(ast);
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
            context.diagnostics.report(diagnostics.RESERVED_KEYWORD(name), {
                node: ast,
                word: name,
            });
        }
        const analyzeMetaData = plugableRecord.getUnsafe(context.meta.data, dataKey);
        analyzeMetaData.layerDefs[name] = ast;
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
    } else if (!definedSymbol.import && global) {
        definedSymbol.global = true;
    } else if (definedSymbol.import && global) {
        context.diagnostics.report(diagnostics.RECONFIGURE_IMPORTED(name), {
            node: ast,
            word: name,
        });
    }
}
