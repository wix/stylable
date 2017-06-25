import { Pojo } from './index.d';

export interface CSSImportRaw {
    SbDefault: string;
    SbNamed: string;
    [key: string]: string;
}

export class Import {
    static fromImportObject(SbFrom: string, cssImportDef: CSSImportRaw) {
        SbFrom = SbFrom || cssImportDef['SbFrom'];
        const namedMap: Pojo<string> = {};

        if (cssImportDef["SbNamed"]) {
            cssImportDef["SbNamed"].split(',').forEach((name) => {
                const parts = name.trim().split(/\s+as\s+/);
                if (parts.length === 1) {
                    namedMap[parts[0]] = parts[0];
                } else if (parts.length === 2) {
                    namedMap[parts[0]] = parts[1];
                }
            })
        }

        for (var key in cssImportDef) {
            const match = key.match(/^SbNamed(.+)/);
            if (match) {
                namedMap[match[1]] = cssImportDef[key];
            }
        }

        return new Import(SbFrom.slice(1, -1), cssImportDef.SbDefault, namedMap);
    }
    constructor(public SbFrom: string, public SbDefault: string = "", public SbNamed: Pojo<string> = {}) { }
    containsSymbol(symbol: string) {
        return symbol && this.SbDefault === symbol
    }
}
