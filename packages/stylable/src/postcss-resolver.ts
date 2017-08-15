// import * as postcss from 'postcss';
// import * as path from 'path';
import { StylableMeta, ImportSymbol, StylableSymbol } from './postcss-process';
import { FileProcessor } from "./cached-process-file";
import { stripQuotation } from "./utils";

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
    constructor(private fileProcessor: FileProcessor<StylableMeta>, private requireModule: (modulePath: string) => any) {

    }
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
}



