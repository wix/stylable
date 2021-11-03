import type { FileProcessor } from './cached-process-file';
import type { Diagnostics } from './diagnostics';
import type { StylableMeta } from './stylable-meta';
import type {
    ImportSymbol,
    ClassSymbol,
    ElementSymbol,
    Imported,
    StylableSymbol,
} from './features';
import type { StylableTransformer } from './stylable-transformer';
import { valueMapping } from './stylable-value-parsers';

export const resolverWarnings = {
    UNKNOWN_IMPORTED_FILE(path: string) {
        return `cannot resolve imported file: "${path}"`;
    },
    UNKNOWN_IMPORTED_SYMBOL(name: string, path: string) {
        return `cannot resolve imported symbol "${name}" from stylesheet "${path}"`;
    },
};

export type JsModule = {
    default?: unknown;
    [key: string]: unknown;
};

export interface InvalidCachedModule {
    kind: 'js' | 'css';
    value: null;
    error: unknown;
    request: string;
    context: string;
}

export interface CachedStylableMeta {
    resolvedPath: string;
    kind: 'css';
    value: StylableMeta;
}

export interface CachedJsModule {
    resolvedPath: string;
    kind: 'js';
    value: JsModule;
}

export type CachedModuleEntity = InvalidCachedModule | CachedStylableMeta | CachedJsModule;
export type StylableResolverCache = Map<string, CachedModuleEntity>;

export interface CSSResolve<T extends StylableSymbol = StylableSymbol> {
    _kind: 'css';
    symbol: T;
    meta: StylableMeta;
}

export interface JSResolve {
    _kind: 'js';
    symbol: any;
    meta: null;
}

export function isInPath(
    extendPath: Array<CSSResolve<ClassSymbol | ElementSymbol>>,
    { symbol: { name: name1 }, meta: { source: source1 } }: CSSResolve<ClassSymbol | ElementSymbol>
) {
    return extendPath.find(({ symbol: { name }, meta: { source } }) => {
        return name1 === name && source === source1;
    });
}

// this is a safe cache key delimiter for all OS;
const safePathDelimiter = ';:';

export class StylableResolver {
    constructor(
        protected fileProcessor: FileProcessor<StylableMeta>,
        protected requireModule: (modulePath: string) => any,
        protected cache?: StylableResolverCache
    ) {}
    private getModule({ context, from }: Imported): CachedModuleEntity {
        const key = `${context}${safePathDelimiter}${from}`;
        if (this.cache?.has(key)) {
            return this.cache.get(key)!;
        }

        let entity: CachedModuleEntity;

        if (from.endsWith('.css')) {
            const kind = 'css';

            try {
                const resolvedPath = this.fileProcessor.resolvePath(from, context);
                const value = this.fileProcessor.process(resolvedPath, false, context);
                entity = { kind, value, resolvedPath };
            } catch (error) {
                entity = { kind, value: null, error, request: from, context };
            }
        } else {
            const kind = 'js';

            try {
                const resolvedPath = this.fileProcessor.resolvePath(from, context);
                const value = this.requireModule(resolvedPath);
                entity = { kind, value, resolvedPath };
            } catch (error) {
                entity = { kind, value: null, error, request: from, context };
            }
        }

        this.cache?.set(key, entity);

        return entity;
    }

    public resolveImported(
        imported: Imported,
        name: string,
        subtype: 'mappedSymbols' | 'mappedKeyframes' = 'mappedSymbols'
    ): CSSResolve | JSResolve | null {
        const res = this.getModule(imported);
        if (res.value === null) {
            return null;
        }

        if (res.kind === 'css') {
            const { value: meta } = res;
            return {
                _kind: 'css',
                symbol: !name ? meta.mappedSymbols[meta.root] : meta[subtype][name],
                meta,
            };
        } else {
            const { value: jsModule } = res;
            return {
                _kind: 'js',
                symbol: !name ? jsModule.default || jsModule : jsModule[name],
                meta: null,
            };
        }
    }
    public resolveImport(importSymbol: ImportSymbol) {
        const name = importSymbol.type === 'named' ? importSymbol.name : '';
        return this.resolveImported(importSymbol.import, name);
    }
    public resolve(maybeImport: StylableSymbol | undefined): CSSResolve | JSResolve | null {
        if (!maybeImport || maybeImport._kind !== 'import') {
            if (
                maybeImport &&
                maybeImport._kind !== 'var' &&
                maybeImport._kind !== 'cssVar' &&
                maybeImport._kind !== 'keyframes'
            ) {
                if (maybeImport.alias && !maybeImport[valueMapping.extends]) {
                    maybeImport = maybeImport.alias;
                } else if (maybeImport[valueMapping.extends]) {
                    maybeImport = maybeImport[valueMapping.extends];
                } else {
                    return null;
                }
            } else {
                return null;
            }
        }
        if (!maybeImport || maybeImport._kind !== 'import') {
            return null;
        }
        return this.resolveImport(maybeImport);
    }
    public resolveKeyframes(meta: StylableMeta, name: string) {
        const initSymbol = meta.mappedKeyframes[name];
        let current = {
            meta,
            symbol: initSymbol,
        };

        while (current.symbol?.import) {
            const res = this.resolveImported(
                current.symbol.import,
                current.symbol.name,
                'mappedKeyframes'
            );
            if (res?._kind === 'css' && res.symbol?._kind === 'keyframes') {
                const { meta, symbol } = res;
                current = {
                    meta,
                    symbol,
                };
            } else {
                return undefined;
            }
        }
        if (current.symbol) {
            return current;
        }
        return undefined;
    }
    public deepResolve(
        maybeImport: StylableSymbol | undefined,
        path: StylableSymbol[] = []
    ): CSSResolve | JSResolve | null {
        let resolved = this.resolve(maybeImport);
        while (
            resolved &&
            resolved._kind === 'css' &&
            resolved.symbol &&
            resolved.symbol._kind === 'import'
        ) {
            resolved = this.resolve(resolved.symbol);
        }
        if (
            resolved &&
            resolved.symbol &&
            resolved.meta &&
            (resolved.symbol._kind === 'class' || resolved.symbol._kind === 'element') &&
            resolved.symbol.alias &&
            !resolved.symbol[valueMapping.extends]
        ) {
            if (path.includes(resolved.symbol)) {
                return { _kind: 'css', symbol: resolved.symbol, meta: resolved.meta };
            }
            path.push(resolved.symbol);
            return this.deepResolve(resolved.symbol.alias, path);
        }
        return resolved;
    }
    public resolveSymbolOrigin(
        symbol: StylableSymbol | undefined,
        meta: StylableMeta,
        path: StylableSymbol[] = []
    ): CSSResolve | null {
        if (!symbol || !meta) {
            return null;
        }
        if (symbol._kind === 'element' || symbol._kind === 'class') {
            if (path.includes(symbol)) {
                return { meta, symbol, _kind: 'css' };
            }
            path.push(symbol);
            const isAliasOnly = symbol.alias && !symbol[valueMapping.extends];
            return isAliasOnly
                ? this.resolveSymbolOrigin(symbol.alias, meta, path)
                : { meta, symbol, _kind: 'css' };
        } else if (symbol._kind === 'cssVar') {
            if (path.includes(symbol)) {
                return { meta, symbol, _kind: 'css' };
            }
        } else if (symbol._kind === 'import') {
            const resolved = this.resolveImport(symbol);
            if (resolved && resolved.symbol && resolved._kind === 'css') {
                return this.resolveSymbolOrigin(resolved.symbol, resolved.meta, path);
            } else {
                return null;
            }
        }
        return null;
    }
    public resolveClass(meta: StylableMeta, symbol: StylableSymbol) {
        return this.resolveName(meta, symbol, false);
    }

    public resolveName(
        meta: StylableMeta,
        symbol: StylableSymbol,
        isElement: boolean
    ): CSSResolve<ClassSymbol | ElementSymbol> | null {
        const type = isElement ? 'element' : 'class';
        let finalSymbol;
        let finalMeta;
        if (symbol._kind === type) {
            finalSymbol = symbol;
            finalMeta = meta;
        } else if (symbol._kind === 'import') {
            const resolved = this.deepResolve(symbol);
            if (resolved && resolved._kind === 'css' && resolved.symbol) {
                if (resolved.symbol._kind === 'class' || resolved.symbol._kind === 'element') {
                    finalSymbol = resolved.symbol;
                    finalMeta = resolved.meta;
                } else {
                    // TODO: warn
                }
            } else {
                // TODO: warn
            }
        } else {
            // TODO: warn
        }

        if (finalMeta && finalSymbol) {
            return {
                _kind: 'css',
                symbol: finalSymbol,
                meta: finalMeta,
            };
        } else {
            return null;
        }
    }
    public resolveElement(meta: StylableMeta, symbol: StylableSymbol) {
        return this.resolveName(meta, symbol, true);
    }
    public resolveExtends(
        meta: StylableMeta,
        className: string,
        isElement = false,
        transformer?: StylableTransformer,
        reportError?: (
            res: CSSResolve | JSResolve | null,
            extend: ImportSymbol | ClassSymbol | ElementSymbol,
            extendPath: Array<CSSResolve<ClassSymbol | ElementSymbol>>,
            meta: StylableMeta,
            className: string,
            isElement: boolean
        ) => void
    ): Array<CSSResolve<ClassSymbol | ElementSymbol>> {
        const bucket = isElement ? meta.elements : meta.classes;

        const customSelector = isElement ? null : meta.customSelectors[':--' + className];

        if (!bucket[className] && !customSelector) {
            return [];
        }

        if (customSelector && transformer) {
            const parsed = transformer.resolveSelectorElements(meta, customSelector);
            if (parsed.length === 1) {
                return parsed[0][parsed[0].length - 1].resolved;
            } else {
                return [];
            }
        }

        let current = {
            _kind: 'css' as const,
            symbol: bucket[className],
            meta,
        };
        const extendPath: Array<CSSResolve<ClassSymbol | ElementSymbol>> = [];

        while (current?.symbol) {
            if (isInPath(extendPath, current)) {
                break;
            }

            extendPath.push(current);

            const parent = current.symbol[valueMapping.extends] || current.symbol.alias;

            if (parent) {
                if (parent._kind === 'import') {
                    const res = this.resolve(parent);
                    if (
                        res &&
                        res._kind === 'css' &&
                        res.symbol &&
                        (res.symbol._kind === 'element' || res.symbol._kind === 'class')
                    ) {
                        const { _kind, meta, symbol } = res;
                        current = {
                            _kind,
                            meta,
                            symbol,
                        };
                    } else {
                        if (reportError) {
                            reportError(res, parent, extendPath, meta, className, isElement);
                        }
                        break;
                    }
                } else {
                    current = { _kind: 'css', symbol: parent, meta };
                }
            } else {
                break;
            }
        }

        return extendPath;
    }
    public validateImports(meta: StylableMeta, diagnostics: Diagnostics) {
        for (const importObj of meta.imports) {
            const resolvedImport = this.resolveImported(importObj, '');

            if (!resolvedImport) {
                // warn about unknown imported files
                const fromDecl =
                    importObj.rule.nodes &&
                    importObj.rule.nodes.find(
                        (decl) => decl.type === 'decl' && decl.prop === valueMapping.from
                    );

                diagnostics.warn(
                    fromDecl || importObj.rule,
                    resolverWarnings.UNKNOWN_IMPORTED_FILE(importObj.request),
                    { word: importObj.request }
                );
            } else if (resolvedImport._kind === 'css') {
                // warn about unknown named imported symbols
                for (const name in importObj.named) {
                    const origName = importObj.named[name];
                    const resolvedSymbol = this.resolveImported(importObj, origName);

                    if (resolvedSymbol === null || !resolvedSymbol.symbol) {
                        const namedDecl =
                            importObj.rule.nodes &&
                            importObj.rule.nodes.find(
                                (decl) => decl.type === 'decl' && decl.prop === valueMapping.named
                            );

                        diagnostics.warn(
                            namedDecl || importObj.rule,
                            resolverWarnings.UNKNOWN_IMPORTED_SYMBOL(origName, importObj.request),
                            { word: origName }
                        );
                    }
                }
            }
        }
    }
    public resolvePath(path: string, context?: string) {
        return this.fileProcessor.resolvePath(path, context);
    }
}
