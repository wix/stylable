import { createFeature, FeatureContext, FeatureTransformContext } from './feature';
import { generalDiagnostics } from './diagnostics';
import * as STSymbol from './st-symbol';
import { plugableRecord } from '../helpers/plugable-record';
import { parseStImport, parsePseudoImport, parseImportMessages } from '../helpers/import';
import {
    AnalyzedExports,
    analyzeExportMessages,
    analyzeStExport,
    emptyAnalyzedExports,
} from '../helpers/export';
import { validateCustomPropertyName } from '../helpers/css-custom-property';
import type { StylableMeta } from '../stylable-meta';
import path from 'path';
import type { ImmutablePseudoClass, PseudoClass } from '@tokey/css-selector-parser';
import type * as postcss from 'postcss';
import { createDiagnosticReporter } from '../diagnostics';
import type { Stylable } from '../stylable';

export interface ImportSymbol {
    _kind: 'import';
    type: 'named' | 'default';
    name: string;
    import: Imported;
    context: string;
}

export interface AnalyzedImport {
    from: string;
    default: string;
    named: Record<string, string>;
    typed: {
        keyframes: Record<string, string>;
    };
}

export interface Imported {
    from: string;
    defaultExport: string;
    named: Record<string, string>;
    /**@deprecated use imported.typed.keyframes (remove in stylable 5) */
    keyframes: Record<string, string>;
    typed: Record<string, Record<string, string>>;
    rule: postcss.Rule | postcss.AtRule;
    request: string;
    context: string;
}

export const PseudoImport = `:import`;
export const PseudoImportDecl = {
    DEFAULT: `-st-default` as const,
    NAMED: `-st-named` as const,
    FROM: `-st-from` as const,
};

/**
 * ImportTypeHook is used as a way to cast imported symbols before resolving their actual type.
 * currently used only for `keyframes` as they are completely on a separate namespace from other symbols.
 *
 * Hooks are registered statically since the features are static and cannot be selected/disabled.
 * If the system will ever change to support picking features dynamically, this mechanism would
 * have to move into the `metaInit` hook.
 */
export const ImportTypeHook = new Map<
    string,
    (context: FeatureContext, localName: string, importName: string, importDef: Imported) => void
>();

const dataKey = plugableRecord.key<Imported[]>('imports');
const exportsDataKey = plugableRecord.key<AnalyzedExports>('exports');

export const diagnostics = {
    ...parseImportMessages,
    ...analyzeExportMessages,
    FORBIDDEN_DEF_IN_COMPLEX_SELECTOR: generalDiagnostics.FORBIDDEN_DEF_IN_COMPLEX_SELECTOR,
    NO_ST_IMPORT_IN_NESTED_SCOPE: createDiagnosticReporter(
        '05011',
        'error',
        () => `cannot use "@st-import" inside of nested scope`
    ),
    NO_PSEUDO_IMPORT_IN_NESTED_SCOPE: createDiagnosticReporter(
        '05012',
        'error',
        () => `cannot use ":import" inside of nested scope`
    ),
    INVALID_CUSTOM_PROPERTY_AS_VALUE: createDiagnosticReporter(
        '05013',
        'error',
        (name: string, as: string) =>
            `invalid alias for custom property "${name}" as "${as}"; custom properties must be prefixed with "--" (double-dash)`
    ),
    UNKNOWN_IMPORTED_SYMBOL: createDiagnosticReporter(
        '05015',
        'error',
        (name: string, path: string) =>
            `cannot resolve imported symbol "${name}" from stylesheet "${path}"`
    ),
    UNKNOWN_IMPORTED_FILE: createDiagnosticReporter(
        '05016',
        'error',
        (path: string) => `cannot resolve imported file: "${path}"`
    ),
    UNKNOWN_TYPED_IMPORT: createDiagnosticReporter(
        '05018',
        'error',
        (type: string) => `Unknown type import "${type}"`
    ),
};

// HOOKS

export const hooks = createFeature<{
    SELECTOR: PseudoClass;
    IMMUTABLE_SELECTOR: ImmutablePseudoClass;
}>({
    metaInit({ meta }) {
        plugableRecord.set(meta.data, dataKey, []);
    },
    analyzeInit(context) {
        const dirContext = path.dirname(context.meta.source);
        // collect shallow imports
        for (const node of context.meta.sourceAst.nodes) {
            if (!isModuleStatement(node)) {
                continue;
            }
            if (node.type === 'atrule' && node.name === 'st-export') {
                let exports = plugableRecord.get(context.meta.data, exportsDataKey);
                if (!exports) {
                    exports = emptyAnalyzedExports();
                    plugableRecord.set(context.meta.data, exportsDataKey, exports);
                }
                analyzeStExport(node, exports, context.diagnostics);
                continue;
            }
            const imports = plugableRecord.getUnsafe(context.meta.data, dataKey);
            const parsedImport =
                node.type === `atrule`
                    ? parseStImport(node, dirContext, context.diagnostics)
                    : parsePseudoImport(node, dirContext, context.diagnostics);
            imports.push(parsedImport);
            addImportSymbols(parsedImport, context, dirContext);
        }
    },
    analyzeAtRule({ context, atRule }) {
        if (atRule.name !== `st-import`) {
            return;
        }
        if (atRule.parent?.type !== `root`) {
            context.diagnostics.report(diagnostics.NO_ST_IMPORT_IN_NESTED_SCOPE(), {
                node: atRule,
            });
        }
    },
    analyzeSelectorNode({ context, rule, node }) {
        if (node.value !== `import`) {
            return;
        }
        if (rule.selector !== `:import`) {
            context.diagnostics.report(
                diagnostics.FORBIDDEN_DEF_IN_COMPLEX_SELECTOR(PseudoImport),
                { node: rule }
            );
            return;
        }
        if (rule.parent?.type !== `root`) {
            context.diagnostics.report(diagnostics.NO_PSEUDO_IMPORT_IN_NESTED_SCOPE(), {
                node: rule,
            });
        }
    },
    prepareAST({ node, toRemove }) {
        if (isModuleStatement(node)) {
            toRemove.push(node);
        }
    },
    transformInit({ context }) {
        validateImports(context);
    },
});

// API

export class StylablePublicApi {
    constructor(private stylable: Stylable) {}
    public analyze(meta: StylableMeta): AnalyzedImport[] {
        return getImportStatements(meta).map(({ request, defaultExport, named, keyframes }) => ({
            from: request,
            default: defaultExport,
            named,
            typed: {
                keyframes,
            },
        }));
    }
}

function isModuleStatement(node: postcss.ChildNode): node is postcss.Rule | postcss.AtRule {
    return (
        (node.type === `atrule` && (node.name === `st-import` || node.name === `st-export`)) ||
        (node.type === `rule` && node.selector === `:import`)
    );
}

export function getImportStatements({ data }: StylableMeta): ReadonlyArray<Imported> {
    const state = plugableRecord.getUnsafe(data, dataKey);
    return state;
}

export function createImportSymbol(
    importDef: Imported,
    type: `default` | `named`,
    name: string,
    dirContext: string
): ImportSymbol {
    return {
        _kind: 'import',
        type: type === 'default' ? `default` : `named`,
        name: type === `default` ? name : importDef.named[name],
        import: importDef,
        context: dirContext,
    };
}

export function getExportInternalName(
    meta: StylableMeta,
    name: string,
    exportTo: 'stylable' | 'javascript',
    namespace: STSymbol.Namespaces = 'main'
) {
    const exportsData = plugableRecord.get(meta.data, exportsDataKey);
    if (!exportsData) {
        // auto exports
        return STSymbol.getAll(meta, namespace)[name] ? name : undefined;
    }
    // explicit exports
    const exportGroup = exportTo === 'stylable' ? 'stExports' : 'jsExports';
    const publicToPrivate = exportsData[exportGroup].publicToPrivate;
    const bucket = namespace === 'main' ? publicToPrivate.named : publicToPrivate.typed[namespace];
    return bucket?.[name];
}

export function mapJavaScriptExports<T>({
    meta,
    data,
    mapTo,
    namespace = 'main',
}: {
    meta: StylableMeta;
    data: Record<string, T>;
    mapTo?: (value: T) => string;
    namespace?: STSymbol.Namespaces;
}) {
    // generate unmapped exports
    const unmapped = Object.entries(data).reduce((acc, [name, value]) => {
        acc[name] = mapTo ? mapTo(value) : String(value);
        return acc;
    }, {} as Record<string, string>);
    // check for explicit exports
    const exportsData = plugableRecord.get(meta.data, exportsDataKey);
    if (!exportsData) {
        // no @st-export - all is exported as is
        return unmapped;
    }
    // map imports according to export mapping
    const privateToPublic = exportsData.jsExports.privateToPublic;
    const bucket = namespace === 'main' ? privateToPublic.named : privateToPublic.typed[namespace];
    // ToDo: test with no export - bucket=undefined
    const mapped = Object.entries(unmapped).reduce((acc, [requestName, value]) => {
        if (bucket[requestName]) {
            for (const publicId of bucket[requestName]) {
                acc[publicId] = value;
            }
        }
        return acc;
    }, {} as Record<string, string>);
    return mapped;
}

// internal

function addImportSymbols(importDef: Imported, context: FeatureContext, dirContext: string) {
    checkForInvalidAsUsage(importDef, context);
    if (importDef.defaultExport) {
        STSymbol.addSymbol({
            context,
            localName: importDef.defaultExport,
            symbol: createImportSymbol(importDef, `default`, `default`, dirContext),
            node: importDef.rule,
        });
    }
    Object.keys(importDef.named).forEach((name) => {
        STSymbol.addSymbol({
            context,
            localName: name,
            symbol: createImportSymbol(importDef, `named`, name, dirContext),
            node: importDef.rule,
        });
    });
    // import as typed symbol
    for (const [type, imports] of Object.entries(importDef.typed)) {
        const handler = ImportTypeHook.get(type);
        if (handler) {
            for (const [localName, importName] of Object.entries(imports)) {
                handler(context, localName, importName, importDef);
            }
        } else {
            context.diagnostics.report(diagnostics.UNKNOWN_TYPED_IMPORT(type), {
                node: importDef.rule,
                word: type,
            });
        }
    }
}

function checkForInvalidAsUsage(importDef: Imported, context: FeatureContext) {
    for (const [local, imported] of Object.entries(importDef.named)) {
        if (validateCustomPropertyName(imported) && !validateCustomPropertyName(local)) {
            context.diagnostics.report(
                diagnostics.INVALID_CUSTOM_PROPERTY_AS_VALUE(imported, local),
                { node: importDef.rule }
            );
        }
    }
}

function validateImports(context: FeatureTransformContext) {
    const imports = plugableRecord.getUnsafe(context.meta.data, dataKey);
    for (const importObj of imports) {
        const resolvedImport = context.resolver.resolveImported(importObj, '');

        if (!resolvedImport) {
            // warn about unknown imported files
            const fromDecl =
                importObj.rule.nodes &&
                importObj.rule.nodes.find(
                    (decl) => decl.type === 'decl' && decl.prop === PseudoImportDecl.FROM
                );

            context.diagnostics.report(diagnostics.UNKNOWN_IMPORTED_FILE(importObj.request), {
                node: fromDecl || importObj.rule,
                word: importObj.request,
            });
        } else if (resolvedImport._kind === 'css') {
            // warn about unknown named imported symbols
            for (const name in importObj.named) {
                const origName = importObj.named[name];
                const resolvedSymbol = context.resolver.resolveImported(
                    importObj,
                    origName,
                    'main',
                    true
                );
                if (resolvedSymbol === null || !resolvedSymbol.symbol) {
                    const namedDecl =
                        importObj.rule.nodes &&
                        importObj.rule.nodes.find(
                            (decl) => decl.type === 'decl' && decl.prop === PseudoImportDecl.NAMED
                        );

                    context.diagnostics.report(
                        diagnostics.UNKNOWN_IMPORTED_SYMBOL(origName, importObj.request),
                        { node: namedDecl || importObj.rule, word: origName }
                    );
                }
            }
            // ToDo: move typed imports validations here
        }
    }
}
