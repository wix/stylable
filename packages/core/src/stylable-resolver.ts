import { FileProcessor } from './cached-process-file';
import { Diagnostics } from './diagnostics';
import { ClassSymbol, ElementSymbol, Imported } from './stylable-meta';
import { ImportSymbol, StylableMeta, StylableSymbol } from './stylable-processor';
import { StylableTransformer } from './stylable-transformer';
import { valueMapping } from './stylable-value-parsers';

export const resolverWarnings = {
    UNKNOWN_IMPORTED_FILE(path: string) {
        return `cannot resolve imported file: "${path}"`;
    },
    UNKNOWN_IMPORTED_SYMBOL(name: string, path: string) {
        return `cannot resolve imported symbol "${name}" from stylesheet "${path}"`;
    }
};

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

export class StylableResolver {
    constructor(
        protected fileProcessor: FileProcessor<StylableMeta>,
        protected requireModule: (modulePath: string) => any
    ) {}
    public resolveImported(imported: Imported, name: string) {
        const { context, from } = imported;
        let symbol: StylableSymbol;
        if (from.match(/\.css$/)) {
            let meta;
            try {
                meta = this.fileProcessor.process(from, false, context);
                symbol = !name ? meta.mappedSymbols[meta.root] : meta.mappedSymbols[name];
            } catch (e) {
                return null;
            }

            return { _kind: 'css', symbol, meta } as CSSResolve;
        } else {
            let _module;
            try {
                _module = this.requireModule(this.fileProcessor.resolvePath(from));
            } catch {
                return null;
            }
            symbol = !name ? _module.default || _module : _module[name];

            return { _kind: 'js', symbol, meta: null } as JSResolve;
        }
    }
    public resolveImport(importSymbol: ImportSymbol) {
        const name = importSymbol.type === 'named' ? importSymbol.name : '';
        return this.resolveImported(importSymbol.import, name);
    }
    public resolve(maybeImport: StylableSymbol | undefined): CSSResolve | JSResolve | null {
        if (!maybeImport || maybeImport._kind !== 'import') {
            if (maybeImport && maybeImport._kind !== 'var' && maybeImport._kind !== 'cssVar') {
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
            if (path.indexOf(resolved.symbol) !== -1) {
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
            if (path.indexOf(symbol) !== -1) {
                return { meta, symbol, _kind: 'css' };
            }
            path.push(symbol);
            const isAliasOnly = symbol.alias && !symbol[valueMapping.extends];
            return isAliasOnly
                ? this.resolveSymbolOrigin(symbol.alias, meta, path)
                : { meta, symbol, _kind: 'css' };
        } else if (symbol._kind === 'cssVar') {
            if (path.indexOf(symbol) !== -1) {
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
                meta: finalMeta
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
        isElement: boolean = false,
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
            meta
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
                        const { _kind, symbol, meta } = res;
                        current = {
                            _kind,
                            symbol,
                            meta
                        };
                    } else {
                        if (reportError) {
                            reportError(res, parent, extendPath, meta, className, isElement);
                        }
                        break;
                    }
                } else {
                    current = { _kind: 'css', symbol: parent, meta: current.meta };
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
                        decl => decl.type === 'decl' && decl.prop === valueMapping.from
                    );

                if (fromDecl) {
                    diagnostics.warn(
                        fromDecl,
                        resolverWarnings.UNKNOWN_IMPORTED_FILE(importObj.fromRelative),
                        { word: importObj.fromRelative }
                    );
                }
            } else if (resolvedImport._kind === 'css') {
                // warn about unknown named imported symbols
                for (const name in importObj.named) {
                    const origName = importObj.named[name];
                    const resolvedSymbol = this.resolveImported(importObj, origName);
                    const namedDecl =
                        importObj.rule.nodes &&
                        importObj.rule.nodes.find(
                            decl => decl.type === 'decl' && decl.prop === valueMapping.named
                        );

                    if (!resolvedSymbol!.symbol && namedDecl) {
                        diagnostics.warn(
                            namedDecl,
                            resolverWarnings.UNKNOWN_IMPORTED_SYMBOL(
                                origName,
                                importObj.fromRelative
                            ),
                            { word: origName }
                        );
                    }
                }
            }
        }
    }
}
