// import * as postcss from 'postcss';
// import * as path from 'path';
import { StylableMeta, ImportSymbol, StylableSymbol } from './stylable-processor';
import { FileProcessor } from "./cached-process-file";
import { stripQuotation } from "./utils";
import { valueMapping } from "./stylable-value-parsers";

export interface CSSResolve {
    _kind: 'css'
    symbol: StylableSymbol
    meta: StylableMeta
}

export interface JSResolve {
    _kind: 'js'
    symbol: any
    meta: null
}

export class StylableResolver {
    constructor(protected fileProcessor: FileProcessor<StylableMeta>, protected requireModule: (modulePath: string) => any) {}
    resolveVarValue(meta: StylableMeta, name: string) {
        let value;
        let symbol = meta.mappedSymbols[name];

        while (symbol) {
            let next;
            if (symbol._kind === 'var' && symbol.import) {
                next = this.resolve(symbol.import);
            } else if (symbol._kind === 'import') {
                next = this.resolve(symbol);
            } else {
                break;
            }

            if (next) {
                symbol = next.symbol;
            } else {
                break;
            }
        }
        if (symbol && symbol._kind === 'var') {
            value = stripQuotation(symbol.value);
        } else if (typeof symbol === 'string' /* only from js */) {
            value = symbol;
        } else {
            value = null;
        }

        return value;
    }
    resolveClass(meta: StylableMeta, symbol: StylableSymbol): CSSResolve | null {

        let finalSymbol;
        let finalMeta;
        if (symbol._kind === 'class') {
            finalSymbol = symbol;
            finalMeta = meta;
        } else if (symbol._kind === 'import') {
            const resolved = this.deepResolve(symbol);
            if (resolved && resolved._kind === 'css' && resolved.symbol) {
                if (resolved.symbol._kind === 'class') {
                    finalSymbol = resolved.symbol;
                    finalMeta = resolved.meta;
                } else {
                    //TODO: warn
                }
            } else {
                //TODO: warn
            }
        } else {
            //TODO: warn
        }

        if (finalMeta && finalSymbol) {
            return {
                _kind: 'css',
                symbol: finalSymbol,
                meta: finalMeta
            }
        } else {
            return null;
        }
    }
    resolve(maybeImport: StylableSymbol | undefined): CSSResolve | JSResolve | null {
        if (!maybeImport || maybeImport._kind !== 'import') {
            return null;
        }
        const importSymbol: ImportSymbol = maybeImport;

        const { from } = importSymbol.import;

        let symbol: StylableSymbol;
        if (from.match(/\.css$/)) {

            const meta = this.fileProcessor.process(from);

            if (importSymbol.type === 'default') {
                symbol = meta.mappedSymbols[meta.root];
            } else {
                symbol = meta.mappedSymbols[importSymbol.name];
            }

            return <CSSResolve>{ _kind: "css", symbol, meta };

        } else {

            const _module = this.requireModule(from);

            if (importSymbol.type === 'default') {
                symbol = _module.default || _module;
            } else {
                symbol = _module[importSymbol.name];
            }

            return <JSResolve>{ _kind: "js", symbol, meta: null };
        }
    }
    deepResolve(maybeImport: StylableSymbol | undefined): CSSResolve | JSResolve | null {
        let resolved = this.resolve(maybeImport);
        while (resolved && resolved._kind === 'css' && resolved.symbol && resolved.symbol._kind === 'import') {
            resolved = this.resolve(resolved.symbol);
        }
        return resolved;
    }
    resolveExtends(meta: StylableMeta, className: string): CSSResolve[] {
        if (!meta.classes[className]) {
            return []
        }

        let extendPath = [];
        const resolvedClass = this.resolveClass(meta, meta.classes[className])

        if (resolvedClass && resolvedClass._kind === 'css' && resolvedClass.symbol._kind === 'class') {
            let current = resolvedClass;
            let extend= resolvedClass.symbol[valueMapping.extends];

            while (current) {
                extendPath.push(current);
                if (!extend) {
                    break;
                }
                let res = this.resolve(extend);
                if (res && res._kind === 'css' && res.symbol._kind === 'class') {
                    current = res;
                    extend = res.symbol[valueMapping.extends];
                } else {
                    break;
                }
            }

        }

        return extendPath
    }
}



