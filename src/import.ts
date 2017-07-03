import { Pojo } from './types';

export interface CSSImportRaw {
    ["-sb-default"]: string;
    ["-sb-named"]: string;
    [key: string]: string;
}

export class Import {
    static fromImportObject(SbFrom: string, cssImportDef: CSSImportRaw) {
        //TODO: handle " and ' strings in SbFrom
        SbFrom = SbFrom || cssImportDef['-sb-from'];
        const namedMap: Pojo<string> = {};

        if (cssImportDef["-sb-named"]) {
            cssImportDef["-sb-named"].split(',').forEach((name) => {
                const parts = name.trim().split(/\s+as\s+/);
                if (parts.length === 1) {
                    namedMap[parts[0]] = parts[0];
                } else if (parts.length === 2) {
                    namedMap[parts[1]] = parts[0];
                }
            })
        }

        for (var key in cssImportDef) {
            const match = key.match(/^-sb-named-(.+)/);
            if (match) {
                namedMap[cssImportDef[key]] = match[1];
            }
        }

        return new Import(SbFrom.slice(1, -1), cssImportDef['-sb-default'], namedMap);
    }
    constructor(public from: string, public defaultExport: string = "", public named: Pojo<string> = {}) { }
    containsSymbol(symbol: string): boolean {
        return symbol ? (this.defaultExport === symbol || !!this.named[symbol]) : false;
    }
}
