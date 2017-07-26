import { Pojo } from './types';
import { valueMapping, STYLABLE_NAMED_MATCHER } from './stylable-value-parsers';

export interface CSSImportRaw {
    [key: string]: string;
}

export class Import {
    constructor(public from: string, public defaultExport: string = "", public named: Pojo<string> = {}) { }
    static fromImportObject(SbFrom: string, cssImportDef: CSSImportRaw) {
        //TODO: handle " and ' strings in SbFrom
        const namedMap: Pojo<string> = {};

        SbFrom = SbFrom || cssImportDef[valueMapping.from];

        if(!SbFrom){ return null; }

        if (cssImportDef[valueMapping.named]) {
            cssImportDef[valueMapping.named].split(',').forEach((name) => {
                const parts = name.trim().split(/\s+as\s+/);
                if (parts.length === 1) {
                    namedMap[parts[0]] = parts[0];
                } else if (parts.length === 2) {
                    namedMap[parts[1]] = parts[0];
                }
            });
        }

        for (const key in cssImportDef) {
            const match = key.match(STYLABLE_NAMED_MATCHER);
            if (match) {
                namedMap[cssImportDef[key]] = match[1];
            }
        }

        if (SbFrom.charAt(0) === '"' || SbFrom.charAt(0) === "'") {
            SbFrom = SbFrom.slice(1, -1);
        }

        return new Import(SbFrom, cssImportDef[valueMapping.default], namedMap);
    }
    containsSymbol(symbol: string): boolean {
        return symbol ? (this.defaultExport === symbol || !!this.named[symbol]) : false;
    }
}
