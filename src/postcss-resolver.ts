// import * as postcss from 'postcss';
// import * as path from 'path';
import { FileProcessor } from './cached-process-file';
import { ImportSymbol, StylableMeta, StylableSymbol } from './stylable-processor';
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
    ) {}
    public resolveClass(meta: StylableMeta, symbol: StylableSymbol) {
        return this.resolveName(meta, symbol, false);
    }
    public resolveElement(meta: StylableMeta, symbol: StylableSymbol) {
        return this.resolveName(meta, symbol, true);
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
    public resolve(maybeImport: StylableSymbol | undefined): CSSResolve | JSResolve | null {
        if (!maybeImport || maybeImport._kind !== 'import') {
            return null;
        }
        const importSymbol: ImportSymbol = maybeImport;

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
                symbol = meta.mappedSymbols[importSymbol.name] || meta.elements[importSymbol.name];
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
    public deepResolve(maybeImport: StylableSymbol | undefined): CSSResolve | JSResolve | null {
        let resolved = this.resolve(maybeImport);
        while (resolved && resolved._kind === 'css' && resolved.symbol && resolved.symbol._kind === 'import') {
            resolved = this.resolve(resolved.symbol);
        }
        if (
            resolved
            && resolved.symbol
            && resolved.symbol._kind === 'class'
            && resolved.symbol.alias
            && !resolved.symbol[valueMapping.extends]
        ) {
            return this.deepResolve(resolved.symbol.alias);
        }
        return resolved;
    }
    public resolveExtends(meta: StylableMeta, className: string, isElement: boolean = false): CSSResolve[] {
        const bucket = isElement ? meta.elements : meta.classes;
        const type = isElement ? 'element' : 'class';

        if (!bucket[className]) {
            return [];
        }

        const extendPath = [];
        const resolvedClass = this.resolveName(meta, bucket[className], isElement);

        if (resolvedClass && resolvedClass._kind === 'css' && resolvedClass.symbol._kind === type) {
            let current = resolvedClass;
            let extend = resolvedClass.symbol[valueMapping.extends] || resolvedClass.symbol.alias;

            while (current) {
                extendPath.push(current);
                if (!extend) {
                    break;
                }
                const res = this.resolve(extend);
                if (res && res._kind === 'css' && (res.symbol._kind === 'element' || res.symbol._kind === 'class')) {
                    current = res;
                    extend = res.symbol[valueMapping.extends];
                } else {
                    break;
                }
            }
        }

        return extendPath;
    }
}
