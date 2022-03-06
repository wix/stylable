import type { FileProcessor } from './cached-process-file';
import type { Diagnostics } from './diagnostics';
import type { StylableMeta } from './stylable-meta';
import {
    ImportSymbol,
    ClassSymbol,
    ElementSymbol,
    Imported,
    StylableSymbol,
    CSSClass,
    STSymbol,
    VarSymbol,
    CSSVarSymbol,
    KeyframesSymbol,
    CSSKeyframes,
} from './features';
import type { StylableTransformer } from './stylable-transformer';
import { valueMapping } from './stylable-value-parsers';
import { findRule } from './helpers/rule';
import type { ModuleResolver } from './types';

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
export type CSSResolvePath = Array<CSSResolve<ClassSymbol | ElementSymbol>>;

export interface JSResolve {
    _kind: 'js';
    symbol: any;
    meta: null;
}

export interface MetaParts {
    mainNamespace: Record<string, StylableSymbol['_kind'] | 'js'>;
    class: Record<string, Array<CSSResolve<ClassSymbol | ElementSymbol>>>;
    element: Record<string, Array<CSSResolve<ClassSymbol | ElementSymbol>>>;
    var: Record<string, CSSResolve<VarSymbol>>;
    js: Record<string, JSResolve>;
    cssVar: Record<string, CSSResolve<CSSVarSymbol>>;
    keyframes: Record<string, CSSResolve<KeyframesSymbol>>;
    import: Record<string, CSSResolve<ImportSymbol>>;
}

export type ReportError = (
    res: CSSResolve | JSResolve | null,
    extend: ImportSymbol | ClassSymbol | ElementSymbol,
    extendPath: Array<CSSResolve<ClassSymbol | ElementSymbol>>,
    meta: StylableMeta,
    name: string,
    isElement: boolean
) => void;

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
        protected requireModule: (resolvedPath: string) => any,
        public resolvePath: ModuleResolver,
        protected cache?: StylableResolverCache
    ) {}
    private getModule({ context, request }: Imported): CachedModuleEntity {
        const key = `${context}${safePathDelimiter}${request}`;
        if (this.cache?.has(key)) {
            return this.cache.get(key)!;
        }

        let entity: CachedModuleEntity;

        if (request.endsWith('.css')) {
            const kind = 'css';
            try {
                const resolvedPath = this.resolvePath(context, request);
                entity = { kind, value: this.fileProcessor.process(resolvedPath), resolvedPath };
            } catch (error) {
                entity = { kind, value: null, error, request, context };
            }
        } else {
            const kind = 'js';
            try {
                const resolvedPath = this.resolvePath(context, request);
                entity = { kind, value: this.requireModule(resolvedPath), resolvedPath };
            } catch (error) {
                entity = { kind, value: null, error, request, context };
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
            const namespace = subtype === `mappedSymbols` ? `main` : `keyframes`;
            name = !name && namespace === `main` ? `root` : name;
            const symbol = STSymbol.getAll(meta, namespace)[name];
            return {
                _kind: 'css',
                symbol,
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
            } else if (maybeImport && maybeImport._kind === 'cssVar') {
                if (maybeImport.alias) {
                    maybeImport = maybeImport.alias;
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
        if (resolved && resolved.symbol && resolved.meta) {
            if (
                ((resolved.symbol._kind === 'class' || resolved.symbol._kind === 'element') &&
                    resolved.symbol.alias &&
                    !resolved.symbol[valueMapping.extends]) ||
                (resolved.symbol._kind === 'cssVar' && resolved.symbol.alias)
            ) {
                if (path.includes(resolved.symbol)) {
                    return { _kind: 'css', symbol: resolved.symbol, meta: resolved.meta };
                }
                path.push(resolved.symbol);
                return this.deepResolve(resolved.symbol.alias, path);
            }
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

    public resolveSymbols(meta: StylableMeta, diagnostics: Diagnostics) {
        const resolvedSymbols: MetaParts = {
            mainNamespace: {},
            class: {},
            element: {},
            var: {},
            js: {},
            keyframes: {},
            cssVar: {},
            import: {},
        };
        // resolve main namespace
        for (const [name, symbol] of Object.entries(meta.getAllSymbols())) {
            let deepResolved: CSSResolve | JSResolve | null;
            if (symbol._kind === `import` || (symbol._kind === `cssVar` && symbol.alias)) {
                deepResolved = this.deepResolve(symbol);
                if (!deepResolved || !deepResolved.symbol) {
                    // ToDo: handle...
                    continue;
                } else if (deepResolved?._kind === `js`) {
                    resolvedSymbols.js[name] = deepResolved;
                    resolvedSymbols.mainNamespace[name] = `js`;
                    continue;
                } else {
                    if (
                        symbol._kind !== `cssVar` &&
                        (deepResolved.symbol._kind === `class` ||
                            deepResolved.symbol._kind === `element`)
                    ) {
                        // virtual alias
                        deepResolved = {
                            _kind: `css`,
                            meta,
                            symbol: {
                                _kind: 'class',
                                name,
                                alias: symbol,
                            },
                        };
                    }
                }
            } else {
                deepResolved = { _kind: `css`, meta, symbol };
            }
            switch (deepResolved.symbol._kind) {
                case `class`:
                    resolvedSymbols.class[name] = this.resolveExtends(
                        meta,
                        deepResolved.symbol,
                        false,
                        undefined,
                        validateClassResolveExtends(meta, name, diagnostics, deepResolved)
                    );
                    break;
                case `element`:
                    resolvedSymbols.element[name] = this.resolveExtends(meta, name, true);
                    break;
                case `var`:
                    resolvedSymbols.var[name] = deepResolved as CSSResolve<VarSymbol>;
                    break;
                case `cssVar`:
                    resolvedSymbols.cssVar[name] = deepResolved as CSSResolve<CSSVarSymbol>;
                    break;
            }
            resolvedSymbols.mainNamespace[name] = deepResolved.symbol._kind;
        }
        // resolve keyframes
        for (const [name, symbol] of Object.entries(CSSKeyframes.getAll(meta))) {
            const result = CSSKeyframes.resolveKeyframes(meta, symbol, this);
            if (result) {
                resolvedSymbols.keyframes[name] = {
                    _kind: `css`,
                    meta: result.meta,
                    symbol: result.symbol,
                };
            }
        }
        return resolvedSymbols;
    }
    public resolveExtends(
        meta: StylableMeta,
        nameOrSymbol: string | ClassSymbol | ElementSymbol,
        isElement = false,
        transformer?: StylableTransformer,
        reportError?: ReportError
    ): CSSResolvePath {
        const name = typeof nameOrSymbol === `string` ? nameOrSymbol : nameOrSymbol.name;
        const symbol =
            typeof nameOrSymbol === `string`
                ? isElement
                    ? meta.getTypeElement(nameOrSymbol)
                    : meta.getClass(nameOrSymbol)
                : nameOrSymbol;

        const customSelector = isElement ? null : meta.customSelectors[':--' + name];

        if (!symbol && !customSelector) {
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

        if (!symbol) {
            return [];
        }

        let current = {
            _kind: 'css' as const,
            symbol,
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
                            reportError(res, parent, extendPath, meta, name, isElement);
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
}
function validateClassResolveExtends(
    meta: StylableMeta,
    name: string,
    diagnostics: Diagnostics,
    deepResolved: CSSResolve<StylableSymbol> | JSResolve | null
): ReportError | undefined {
    return (res, extend) => {
        const decl = findRule(meta.ast, '.' + name);
        if (decl) {
            // ToDo: move to STExtends
            if (res && res._kind === 'js') {
                diagnostics.error(decl, CSSClass.diagnostics.CANNOT_EXTEND_JS(), {
                    word: decl.value,
                });
            } else if (res && !res.symbol) {
                diagnostics.error(
                    decl,
                    CSSClass.diagnostics.CANNOT_EXTEND_UNKNOWN_SYMBOL(extend.name),
                    { word: decl.value }
                );
            } else {
                diagnostics.error(decl, CSSClass.diagnostics.IMPORT_ISNT_EXTENDABLE(), {
                    word: decl.value,
                });
            }
        } else {
            if (deepResolved?.symbol.alias) {
                meta.ast.walkRules(new RegExp('\\.' + name), (rule) => {
                    diagnostics.error(rule, CSSClass.diagnostics.UNKNOWN_IMPORT_ALIAS(name), {
                        word: name,
                    });
                    return false;
                });
            }
        }
    };
}

export function createSymbolResolverWithCache(
    resolver: StylableResolver,
    diagnostics: Diagnostics
) {
    const cache = new Map<StylableMeta, MetaParts>();
    return (meta: StylableMeta): MetaParts => {
        let symbols = cache.get(meta);
        if (!symbols) {
            symbols = resolver.resolveSymbols(meta, diagnostics);
            cache.set(meta, symbols);
        }
        return symbols;
    };
}
