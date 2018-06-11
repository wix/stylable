import { FileProcessor } from './cached-process-file';
import { ImportSymbol, StylableMeta, StylableSymbol } from './stylable-processor';
import { StylableTransformer } from './stylable-transformer';
import { valueMapping } from './stylable-value-parsers';
import { stripQuotation } from './utils';

export interface CSSResolve {
    _kind: 'css';
    symbol: StylableSymbol;
    meta: StylableMeta;
}

export interface JSResolve {
    _kind: 'js';
    symbol: any;
    meta: null;
}

export class StylableResolver {
    constructor(
        protected fileProcessor: FileProcessor<StylableMeta>,
        protected requireModule: (modulePath: string) => any
    ) { }
    public resolveImport(importSymbol: ImportSymbol) {

        const { from } = importSymbol.import;

        let symbol: StylableSymbol;
        if (from.match(/\.css$/)) {
            let meta;
            try {
                meta = this.fileProcessor.process(from);
            } catch (e) {
                return null;
            }

            if (importSymbol.type === 'default') {
                symbol = meta.mappedSymbols[meta.root];
            } else {
                symbol = meta.mappedSymbols[importSymbol.name];
            }

            return { _kind: 'css', symbol, meta } as CSSResolve;

        } else {

            const _module = this.requireModule(from);

            if (importSymbol.type === 'default') {
                symbol = _module.default || _module;
            } else {
                symbol = _module[importSymbol.name];
            }

            return { _kind: 'js', symbol, meta: null } as JSResolve;
        }
    }
    public resolve(maybeImport: StylableSymbol | undefined): CSSResolve | JSResolve | null {
        if (!maybeImport || maybeImport._kind !== 'import') {
            if (maybeImport && maybeImport._kind !== 'var') {
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
        maybeImport: StylableSymbol | undefined, path: StylableSymbol[] = []): CSSResolve | JSResolve | null {
        let resolved = this.resolve(maybeImport);
        while (resolved && resolved._kind === 'css' && resolved.symbol && resolved.symbol._kind === 'import') {
            resolved = this.resolve(resolved.symbol);
        }
        if (
            resolved
            && resolved.symbol
            && resolved.meta
            && (resolved.symbol._kind === 'class' || resolved.symbol._kind === 'element')
            && resolved.symbol.alias
            && !resolved.symbol[valueMapping.extends]
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
        symbol: StylableSymbol | undefined, meta: StylableMeta, path: StylableSymbol[] = []): CSSResolve | null {
        if (!symbol || !meta) { return null; }
        if (symbol._kind === 'element' || symbol._kind === 'class') {
            if (path.indexOf(symbol) !== -1) {
                return { meta, symbol, _kind: 'css' };
            }
            path.push(symbol);
            const isAliasOnly = symbol.alias && !symbol[valueMapping.extends];
            return isAliasOnly ? this.resolveSymbolOrigin(symbol.alias, meta, path) : { meta, symbol, _kind: 'css' };
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

    public resolveName(meta: StylableMeta, symbol: StylableSymbol, isElement: boolean): CSSResolve | null {
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
        transformer?: StylableTransformer
    ): CSSResolve[] {
        const bucket = isElement ? meta.elements : meta.classes;
        const type = isElement ? 'element' : 'class';

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

        const extendPath = [];
        const resolvedClass = this.resolveName(meta, bucket[className], isElement);

        if (
            resolvedClass &&
            resolvedClass._kind === 'css' &&
            resolvedClass.symbol &&
            resolvedClass.symbol._kind === type
        ) {
            let current = resolvedClass;
            let extend = resolvedClass.symbol[valueMapping.extends] || resolvedClass.symbol.alias;

            while (current) {
                extendPath.push(current);
                if (!extend) {
                    break;
                }
                const res = this.resolve(extend);
                if (res &&
                    res._kind === 'css' &&
                    res.symbol &&
                    (res.symbol._kind === 'element' || res.symbol._kind === 'class')
                ) {
                    current = res;
                    extend = res.symbol[valueMapping.extends] || res.symbol.alias;
                } else {
                    break;
                }
            }
        }

        return extendPath;
    }
}
