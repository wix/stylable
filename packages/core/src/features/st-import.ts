import { createFeature, FeatureContext, FeatureTransformContext } from './feature';
import { generalDiagnostics } from './diagnostics';
import type { Imported } from './types';
import * as STSymbol from './st-symbol';
import { plugableRecord } from '../helpers/plugable-record';
import { parseStImport, parsePseudoImport, parseImportMessages } from '../stylable-imports-tools';
import { isCSSVarProp } from '../stylable-utils';
import type { StylableMeta } from '../stylable-meta';
import { rootValueMapping, valueMapping } from '../stylable-value-parsers';
import path from 'path';
import type { ImmutablePseudoClass, PseudoClass } from '@tokey/css-selector-parser';
import type * as postcss from 'postcss';

const dataKey = plugableRecord.key<Imported[]>('import');

export const diagnostics = {
    NO_ST_IMPORT_IN_NESTED_SCOPE() {
        return `cannot use "@st-import" inside of nested scope`;
    },
    NO_PSEUDO_IMPORT_IN_NESTED_SCOPE() {
        return `cannot use ":import" inside of nested scope`;
    },
    INVALID_CUSTOM_PROPERTY_AS_VALUE(name: string, as: string) {
        return `invalid alias for custom property "${name}" as "${as}"; custom properties must be prefixed with "--" (double-dash)`;
    },
    FORBIDDEN_DEF_IN_COMPLEX_SELECTOR: generalDiagnostics.FORBIDDEN_DEF_IN_COMPLEX_SELECTOR,
    ...parseImportMessages,
    UNKNOWN_IMPORTED_SYMBOL(name: string, path: string) {
        return `cannot resolve imported symbol "${name}" from stylesheet "${path}"`;
    },
    UNKNOWN_IMPORTED_FILE(path: string) {
        return `cannot resolve imported file: "${path}"`;
    },
};

// HOOKS

export const hooks = createFeature<{
    SELECTOR: PseudoClass;
    IMMUTABLE_SELECTOR: ImmutablePseudoClass;
}>({
    analyzeInit(context) {
        const imports: Imported[] = [];
        plugableRecord.set(context.meta.data, dataKey, imports);
        // analyze imports first
        const remove: Array<postcss.Rule | postcss.AtRule> = [];
        const dirContext = path.dirname(context.meta.source);
        context.meta.ast.walk((node) => {
            const isImportDef =
                (node.type === `atrule` && node.name === `st-import`) ||
                (node.type === `rule` && node.selector === `:import`);
            if (!isImportDef) {
                return;
            }
            const isStImport = node.type === `atrule`;
            if (node.parent?.type !== `root`) {
                context.diagnostics.warn(
                    node,
                    isStImport
                        ? diagnostics.NO_ST_IMPORT_IN_NESTED_SCOPE()
                        : diagnostics.NO_PSEUDO_IMPORT_IN_NESTED_SCOPE()
                );
            } else {
                const stImport = isStImport
                    ? parseStImport(node, dirContext, context.diagnostics)
                    : parsePseudoImport(node, dirContext, context.diagnostics);
                imports.push(stImport);
                context.meta.imports.push(stImport);
                addImportSymbols(stImport, context, dirContext);
            }
            remove.push(node);
        });
        // remove imports - ToDo: move to transform phase
        for (const node of remove) {
            node.remove();
        }
    },
    analyzeSelectorNode({ context, rule, node }) {
        // forbid `:import` pseudo-class as part of multiple selectors
        if (rule.selector !== `:import` && node.value === `import`) {
            context.diagnostics.warn(
                rule,
                diagnostics.FORBIDDEN_DEF_IN_COMPLEX_SELECTOR(rootValueMapping.import)
            );
        }
    },
    transformInit({ context }) {
        validateImports(context);
    },
});

// API

export function getImportStatements({ data }: StylableMeta): Imported[] {
    const state = plugableRecord.getUnsafe(data, dataKey);
    return [...state];
}

// internal

function addImportSymbols(importDef: Imported, context: FeatureContext, dirContext: string) {
    checkForInvalidAsUsage(importDef, context);
    if (importDef.defaultExport) {
        STSymbol.addSymbol({
            context,
            localName: importDef.defaultExport,
            symbol: {
                _kind: 'import',
                type: 'default',
                name: 'default',
                import: importDef,
                context: dirContext,
            },
            node: importDef.rule,
        });
    }
    Object.keys(importDef.named).forEach((name) => {
        STSymbol.addSymbol({
            context,
            localName: name,
            symbol: {
                _kind: 'import',
                type: 'named',
                name: importDef.named[name],
                import: importDef,
                context: dirContext,
            },
            node: importDef.rule,
        });
    });
    Object.keys(importDef.keyframes).forEach((name) => {
        if (!checkRedeclareKeyframes(context, name, importDef.rule)) {
            // ToDo: move to STSymbol.addSymbol({namespace: `keyframes`})
            context.meta.mappedKeyframes[name] = {
                _kind: 'keyframes',
                alias: name,
                name: importDef.keyframes[name],
                import: importDef,
            };
        }
    });
}

function checkForInvalidAsUsage(importDef: Imported, context: FeatureContext) {
    for (const [local, imported] of Object.entries(importDef.named)) {
        if (isCSSVarProp(imported) && !isCSSVarProp(local)) {
            context.diagnostics.warn(
                importDef.rule,
                diagnostics.INVALID_CUSTOM_PROPERTY_AS_VALUE(imported, local)
            );
        }
    }
}

function validateImports(context: FeatureTransformContext) {
    for (const importObj of context.meta.imports) {
        const resolvedImport = context.resolver.resolveImported(importObj, '');

        if (!resolvedImport) {
            // warn about unknown imported files
            const fromDecl =
                importObj.rule.nodes &&
                importObj.rule.nodes.find(
                    (decl) => decl.type === 'decl' && decl.prop === valueMapping.from
                );

            context.diagnostics.warn(
                fromDecl || importObj.rule,
                diagnostics.UNKNOWN_IMPORTED_FILE(importObj.request),
                { word: importObj.request }
            );
        } else if (resolvedImport._kind === 'css') {
            // warn about unknown named imported symbols
            for (const name in importObj.named) {
                const origName = importObj.named[name];
                const resolvedSymbol = context.resolver.resolveImported(importObj, origName);
                if (resolvedSymbol === null || !resolvedSymbol.symbol) {
                    const namedDecl =
                        importObj.rule.nodes &&
                        importObj.rule.nodes.find(
                            (decl) => decl.type === 'decl' && decl.prop === valueMapping.named
                        );

                    context.diagnostics.warn(
                        namedDecl || importObj.rule,
                        diagnostics.UNKNOWN_IMPORTED_SYMBOL(origName, importObj.request),
                        { word: origName }
                    );
                }
            }
        }
    }
}

// ToDo: move to st-symbol once symbol namespace is implemented
function REDECLARE_SYMBOL_KEYFRAMES(name: string) {
    return `redeclare keyframes symbol "${name}"`;
}
function checkRedeclareKeyframes(context: FeatureContext, symbolName: string, node: postcss.Node) {
    const symbol = context.meta.mappedKeyframes[symbolName];
    if (symbol) {
        context.diagnostics.warn(node, REDECLARE_SYMBOL_KEYFRAMES(symbolName), {
            word: symbolName,
        });
    }
    return symbol;
}
