// import * as postcss from 'postcss';
// import * as path from 'path';
import { StylableMeta, ImportSymbol, StylableSymbol } from './postcss-process';
import { FileProcessor } from "./cached-process-file";

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
    resolve(maybeImport: StylableSymbol | undefined) : CSSResolve | JSResolve | null {
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



