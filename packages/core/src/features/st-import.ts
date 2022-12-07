import { createFeature, FeatureContext, FeatureTransformContext } from './feature';
import { generalDiagnostics } from './diagnostics';
import * as STSymbol from './st-symbol';
import { plugableRecord } from '../helpers/plugable-record';
import {
    parseStImport,
    parsePseudoImport,
    parseImportMessages,
    tryCollectImportsDeep,
} from '../helpers/import';
import { validateCustomPropertyName } from '../helpers/css-custom-property';
import type { StylableMeta } from '../stylable-meta';
import path from 'path';
import type { ImmutablePseudoClass, PseudoClass } from '@tokey/css-selector-parser';
import type * as postcss from 'postcss';
import { createDiagnosticReporter } from '../diagnostics';
import type { Stylable } from '../stylable';
import type { CachedModuleEntity } from '../stylable-resolver';

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

export const diagnostics = {
    ...parseImportMessages,
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
        (path: string, error?: unknown) =>
            `cannot resolve imported file: "${path}"${error ? `\nFailed with:\n${error}` : ''}`
    ),
    UNKNOWN_TYPED_IMPORT: createDiagnosticReporter(
        '05018',
        'error',
        (type: string) => `Unknown type import "${type}"`
    ),
    NO_DEFAULT_EXPORT: createDiagnosticReporter(
        '05020',
        'error',
        (path: string) => `Native CSS files have no default export. Imported file: "${path}"`
    ),
    UNSUPPORTED_NATIVE_IMPORT: createDiagnosticReporter(
        '05021',
        'warning',
        () => `Unsupported @import within imported native CSS file`
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
        const imports = plugableRecord.getUnsafe(context.meta.data, dataKey);
        const dirContext = path.dirname(context.meta.source);
        // collect shallow imports
        for (const node of context.meta.sourceAst.nodes) {
            if (!isImportStatement(node)) {
                continue;
            }
            const parsedImport =
                node.type === `atrule`
                    ? parseStImport(node, dirContext, context.diagnostics)
                    : parsePseudoImport(node, dirContext, context.diagnostics);
            imports.push(parsedImport);
            addImportSymbols(parsedImport, context, dirContext);
        }
    },
    analyzeAtRule({ context, atRule }) {
        if (atRule.name === `st-import` && atRule.parent?.type !== `root`) {
            context.diagnostics.report(diagnostics.NO_ST_IMPORT_IN_NESTED_SCOPE(), {
                node: atRule,
            });
        } else if (atRule.name === `import` && context.meta.type === 'css') {
            context.diagnostics.report(diagnostics.UNSUPPORTED_NATIVE_IMPORT(), {
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
        if (isImportStatement(node)) {
            toRemove.push(node);
        }
    },
    transformInit({ context }) {
        validateImports(context);
        calcCssDepth(context);
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

function calcCssDepth(context: FeatureTransformContext) {
    let cssDepth = 0;
    const deepDependencies = tryCollectImportsDeep(
        context.resolver,
        context.meta,
        new Set(),
        ({ depth }) => {
            cssDepth = Math.max(cssDepth, depth);
        },
        1
    );
    context.meta.transformCssDepth = { cssDepth, deepDependencies };
}

function isImportStatement(node: postcss.ChildNode): node is postcss.Rule | postcss.AtRule {
    return (
        (node.type === `atrule` && node.name === `st-import`) ||
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
        const entity = context.resolver.getModule(importObj);
        if (!entity.value) {
            // warn about unknown imported files
            const fromDecl =
                importObj.rule.nodes &&
                importObj.rule.nodes.find(
                    (decl) => decl.type === 'decl' && decl.prop === PseudoImportDecl.FROM
                );

            context.diagnostics.report(
                diagnostics.UNKNOWN_IMPORTED_FILE(importObj.request, getErrorText(entity)),
                {
                    node: fromDecl || importObj.rule,
                    word: importObj.request,
                }
            );
        } else if (entity.kind === 'css') {
            const meta = entity.value;
            // propagate some native CSS diagnostics to st-import
            if (meta.type === 'css') {
                let foundUnsupportedNativeImport = false;
                for (const report of meta.diagnostics.reports) {
                    if (report.code === '05021') {
                        foundUnsupportedNativeImport = true;
                        break;
                    }
                }
                if (foundUnsupportedNativeImport) {
                    context.diagnostics.report(diagnostics.UNSUPPORTED_NATIVE_IMPORT(), {
                        node: importObj.rule,
                        word: importObj.defaultExport,
                    });
                }
            }
            // report unsupported native CSS default import
            if (meta.type !== 'stylable' && importObj.defaultExport) {
                context.diagnostics.report(diagnostics.NO_DEFAULT_EXPORT(importObj.request), {
                    node: importObj.rule,
                    word: importObj.defaultExport,
                });
            }
            // warn about unknown named imported symbols
            for (const name in importObj.named) {
                const origName = importObj.named[name];
                const resolvedSymbol = context.resolver.resolveImported(importObj, origName);
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
        } else if (entity.kind === 'js') {
            // TODO: add diagnostics for JS imports (typeof checks)
        }
    }
}

function getErrorText(res: CachedModuleEntity) {
    if ('error' in res) {
        const { error } = res;
        if (typeof error === 'object' && error) {
            return 'details' in error
                ? String(error.details)
                : 'message' in error
                ? String(error.message)
                : String(error);
        }
        return String(error);
    }
    return '';
}
