import { Pojo } from './types';
import { SBTypesParsers, valueMapping, STYLABLE_NAMED_MATCHER } from './stylable-value-parsers';

const parseNamed = SBTypesParsers[valueMapping.named];

export interface CSSImportRaw {
    [key: string]: string;
}

export class Import {
    constructor(public from: string, public defaultExport: string = "", public named: Pojo<string> = {}) { }
    static fromImportObject(SbFrom: string, cssImportDef: CSSImportRaw) {
        //TODO: handle " and ' strings in SbFrom

        SbFrom = SbFrom || cssImportDef[valueMapping.from];

        if(!SbFrom){ return null; }

        let namedMap: Pojo<string> = {};
        if (cssImportDef[valueMapping.named]) {
            namedMap = parseNamed(cssImportDef[valueMapping.named]);
        }

        //TODO: rethink this.
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
