import { createFeature, FeatureContext } from './feature';
import * as STSymbol from './st-symbol';
import * as STImport from './st-import';
import type { StylableMeta } from '../stylable-meta';
import { createDiagnosticReporter } from '../diagnostics';
import { plugableRecord } from '../helpers/plugable-record';
import { namespace } from '../helpers/namespace';
import { globalValueFromFunctionNode, GLOBAL_FUNC } from '../helpers/global';
import valueParser, { WordNode } from 'postcss-value-parser';
import type * as postcss from 'postcss';

export interface ContainerSymbol {
    _kind: 'container';
    name: string;
    alias: string;
    global?: boolean;
    import?: STImport.Imported;
}

export interface ResolvedContainer {
    meta: StylableMeta;
    symbol: ContainerSymbol;
}

export const diagnostics = {
    UNEXPECTED_DECL_VALUE: createDiagnosticReporter(
        '20001',
        'error',
        (value: string) => `unexpected value: ${value}`
    ),
    UNKNOWN_DECL_TYPE: createDiagnosticReporter(
        '20002',
        'error',
        (value: string) => `unknown container type: ${value}`
    ),
    MISSING_DECL_TYPE: createDiagnosticReporter(
        '20003',
        'error',
        () => `missing container shorthand type`
    ),
    INVALID_CONTAINER_NAME: createDiagnosticReporter(
        '20004',
        'error',
        (value: string) => `invalid container name: ${value}`
    ),
    UNRESOLVED_CONTAINER_NAME: createDiagnosticReporter(
        '20005',
        'error',
        (value: string) => `unresolved container name: ${value}`
    ),
    UNKNOWN_IMPORTED_CONTAINER: createDiagnosticReporter(
        '20006',
        'error',
        (name: string, path: string) =>
            `cannot resolve imported container name "${name}" from stylesheet "${path}"`
    ),
    MISSING_CONTAINER_NAME_INSIDE_GLOBAL: createDiagnosticReporter(
        '20007',
        'warning',
        () => `Missing container name inside "${GLOBAL_FUNC}()"`
    ),
    UNEXPECTED_DEFINITION: createDiagnosticReporter(
        '20008',
        'error',
        (def: string) => `Unexpected value in container definition: "${def}""`
    ),
};

interface ParsedNames {
    containers: Array<{ name: string; global: boolean }>;
    transformNames: (getTransformedName: (name: string) => string) => string;
}

const dataKey = plugableRecord.key<{
    'container-name': Record<string, ParsedNames>;
    container: Record<string, ParsedNames>;
    definitions: Record<string, postcss.Declaration | postcss.AtRule | postcss.Rule>;
}>('container');

// HOOKS

STImport.ImportTypeHook.set(`container`, (context, localName, importName, importDef) => {
    addContainer({
        context,
        name: localName,
        importName,
        ast: importDef.rule,
        global: false,
        importDef,
        forceDefinition: true,
    });
});

export const hooks = createFeature<{
    RESOLVED: Record<string, ResolvedContainer>;
}>({
    metaInit({ meta }) {
        plugableRecord.set(meta.data, dataKey, {
            'container-name': {},
            container: {},
            definitions: {},
        });
    },
    analyzeDeclaration({ context, decl }) {
        const prop = decl.prop.toLowerCase();
        if (prop !== 'container-name' && prop !== 'container') {
            return;
        }
        const analyzed = plugableRecord.getUnsafe(context.meta.data, dataKey);
        const bucket = analyzed[prop];
        const value = decl.value;
        if (bucket[value]) {
            return;
        }
        const parsed = (bucket[value] = parseContainerDecl(decl, context));
        for (const { name, global } of parsed.containers) {
            addContainer({
                context,
                ast: decl,
                name,
                importName: name,
                global,
                forceDefinition: false,
            });
        }
    },
    analyzeAtRule({ context, atRule }) {
        if (!atRule.nodes) {
            // treat @container with no body as definition
            const ast = valueParser(atRule.params).nodes;
            let searching = true;
            let name = '';
            let global = false;
            for (const node of ast) {
                if (node.type === 'comment' || node.type === 'space') {
                    // do nothing
                    continue;
                } else if (searching && node.type === 'word') {
                    name = node.value;
                } else if (searching && node.type === 'function' && node.value === GLOBAL_FUNC) {
                    name = globalValueFromFunctionNode(node) || '';
                    global = true;
                } else {
                    const def = valueParser.stringify(node);
                    context.diagnostics.report(diagnostics.UNEXPECTED_DEFINITION(def), {
                        node: atRule,
                        word: def,
                    });
                    break;
                }
                searching = false;
            }
            if (name) {
                if (invalidContainerNames[name]) {
                    context.diagnostics.report(diagnostics.INVALID_CONTAINER_NAME(name), {
                        node: atRule,
                        word: name,
                    });
                }
                addContainer({
                    context,
                    ast: atRule,
                    name,
                    importName: name,
                    global,
                    forceDefinition: true,
                });
            }
        }
    },
    transformResolve({ context }) {
        const symbols = STSymbol.getAllByType(context.meta, `container`);
        const resolved: Record<string, ResolvedContainer> = {};
        const resolvedSymbols = context.getResolvedSymbols(context.meta);
        for (const [name, symbol] of Object.entries(symbols)) {
            const res = resolvedSymbols.container[name];
            if (res) {
                resolved[name] = res;
            } else if (symbol.import) {
                context.diagnostics.report(
                    diagnostics.UNKNOWN_IMPORTED_CONTAINER(symbol.name, symbol.import.request),
                    {
                        node: symbol.import.rule,
                        word: symbol.name,
                    }
                );
            }
        }
        return resolved;
    },
    transformDeclaration({ context, decl, resolved }) {
        const prop = decl.prop.toLowerCase();
        if (prop !== 'container-name' && prop !== 'container') {
            return;
        }
        const analyzed = plugableRecord.getUnsafe(context.meta.data, dataKey);
        const bucket = analyzed[prop];
        const value = decl.value;
        decl.value = bucket[value].transformNames((name) => {
            const resolve = resolved[name];
            return resolve ? getTransformedName(resolved[name]) : name;
        });
    },
    transformAtRuleNode({ context, atRule, resolved }) {
        if (!atRule.nodes) {
            // remove definition only @container
            atRule.remove();
            return;
        }
        const ast = valueParser(atRule.params).nodes;
        let changed = false;
        search: for (const node of ast) {
            if (node.type === 'comment' || node.type === 'space') {
                // do nothing
            } else if (node.type === 'word') {
                const resolve = resolved[node.value];
                if (resolve) {
                    node.value = getTransformedName(resolve);
                    changed = true;
                } else {
                    context.diagnostics.report(diagnostics.UNRESOLVED_CONTAINER_NAME(node.value), {
                        node: atRule,
                        word: node.value,
                    });
                }
                break search;
            } else if (node.type === 'function' && node.value === GLOBAL_FUNC) {
                const globalName = globalValueFromFunctionNode(node) || '';
                if (globalName) {
                    changed = true;
                    const wordNode: WordNode = node as any;
                    wordNode.type = 'word';
                    wordNode.value = globalName;
                }
            } else {
                break search;
            }
        }
        if (changed) {
            atRule.params = valueParser.stringify(ast);
        }
        atRule.params = context.evaluator.evaluateValue(context, {
            value: atRule.params,
            meta: context.meta,
            node: atRule,
            initialNode: atRule,
        }).outputValue;
    },
    transformJSExports({ exports, resolved }) {
        for (const [name, resolve] of Object.entries(resolved)) {
            exports.containers[name] = getTransformedName(resolve);
        }
    },
});

const invalidContainerNames: Record<string, true> = {
    and: true,
    not: true,
    or: true,
};

function parseContainerDecl(decl: postcss.Declaration, context: FeatureContext): ParsedNames {
    const { prop, value } = decl;
    const containers: Array<{ name: string; global: boolean }> = [];
    const namedNodeRefs: Record<string, valueParser.Node[]> = {};
    const ast = valueParser(value).nodes;
    let noneFound = false;
    const checkNextName = (node: valueParser.Node) => {
        const { type, value } = node;
        if (type === 'comment' || type === 'space') {
            // do nothing
        } else if (type === 'word' || (type === 'function' && value === GLOBAL_FUNC)) {
            const global = type === 'function';
            const name = global ? globalValueFromFunctionNode(node) || '' : node.value;
            if (global && !name) {
                context.diagnostics.report(diagnostics.MISSING_CONTAINER_NAME_INSIDE_GLOBAL(), {
                    node: decl,
                });
            }
            if (name === 'none') {
                noneFound = true;
                return;
            }
            if (!global) {
                containers.push({ name, global });
                namedNodeRefs[name] ??= [];
                namedNodeRefs[name].push(node);
            } else {
                // mutate to word - this is safe since this node is not exposed
                (node as any).type = 'word';
                (node as any).value = name;
            }
            if (invalidContainerNames[name]) {
                context.diagnostics.report(diagnostics.INVALID_CONTAINER_NAME(name), {
                    node: decl,
                    word: name,
                });
            }
        } else {
            const word = valueParser.stringify(node);
            context.diagnostics.report(diagnostics.UNEXPECTED_DECL_VALUE(word), {
                node: decl,
                word,
            });
            return false;
        }
        return true;
    };
    if (prop.toLowerCase() === 'container-name') {
        for (const node of ast) {
            const continueParse = checkNextName(node);
            if (!continueParse) {
                break;
            }
        }
    } else {
        let nextExpected: 'name' | 'type' | '' = 'name';
        for (const node of ast) {
            const { type, value } = node;

            if (type === 'comment' || type === 'space') {
                // do nothing
            } else if (nextExpected === 'name') {
                if (type === 'div' && value === '/') {
                    nextExpected = 'type';
                } else {
                    const continueParse = checkNextName(node);
                    if (!continueParse) {
                        break;
                    }
                }
            } else if (type === 'word' && nextExpected === 'type') {
                if (value !== 'normal' && value !== 'size' && value !== 'inline-size') {
                    context.diagnostics.report(diagnostics.UNKNOWN_DECL_TYPE(value), {
                        node: decl,
                        word: value,
                    });
                }
                nextExpected = '';
            } else {
                const word = valueParser.stringify(node);
                context.diagnostics.report(diagnostics.UNEXPECTED_DECL_VALUE(word), {
                    node: decl,
                    word,
                });
            }
        }
        if (nextExpected === 'type') {
            context.diagnostics.report(diagnostics.MISSING_DECL_TYPE(), {
                node: decl,
            });
        }
    }
    if (containers.length > 0 && noneFound) {
        context.diagnostics.report(diagnostics.INVALID_CONTAINER_NAME('none'), {
            node: decl,
            word: 'none',
        });
    }
    return {
        containers,
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

// API

export function get(meta: StylableMeta, name: string): ContainerSymbol | undefined {
    return STSymbol.get(meta, name, `container`);
}
export function getAll(meta: StylableMeta): Record<string, ContainerSymbol> {
    return STSymbol.getAllByType(meta, `container`);
}
export function getDefinition(
    meta: StylableMeta,
    name: string
): postcss.Declaration | postcss.AtRule | postcss.Rule | undefined {
    const { definitions } = plugableRecord.getUnsafe(meta.data, dataKey);
    return definitions[name];
}

function getTransformedName({ symbol, meta }: ResolvedContainer) {
    return symbol.global ? symbol.alias : namespace(symbol.alias, meta.namespace);
}

function addContainer({
    context,
    name,
    importName,
    ast,
    global,
    importDef,
    forceDefinition,
}: {
    context: FeatureContext;
    name: string;
    importName: string;
    ast: postcss.Declaration | postcss.AtRule | postcss.Rule;
    global: boolean;
    importDef?: STImport.Imported;
    forceDefinition: boolean;
}) {
    const { definitions } = plugableRecord.getUnsafe(context.meta.data, dataKey);
    const definedSymbol = STSymbol.get(context.meta, name, 'container');
    const isFirst = !definedSymbol;
    if (forceDefinition || isFirst) {
        if (context.meta.type !== 'stylable') {
            global = true;
        }
        definitions[name] = ast;
        STSymbol.addSymbol({
            context,
            node: ast,
            localName: name,
            symbol: {
                _kind: 'container',
                name: importName,
                alias: name,
                global,
                import: importDef,
            },
            safeRedeclare: false,
        });
    }
}
