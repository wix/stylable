import { Pojo } from './types';

export const SB_FROM = '-sb-from';
const SB_NAMED = '-sb-named';
const SB_DEFAULT = '-sb-default';
const SB_NAMED_MATCHER = new RegExp(`^${SB_NAMED}-(.+)`);

export interface CSSImportRaw {
    "-sb-from": string;
    "-sb-named": string;
    [key: string]: string;
}

export class Import {
    constructor(public from: string, public defaultExport: string = "", public named: Pojo<string> = {}) {

    }
    static fromImportObject(SbFrom: string, cssImportDef: CSSImportRaw) {
        //TODO: handle " and ' strings in SbFrom
        const namedMap: Pojo<string> = {};

        SbFrom = SbFrom || cssImportDef[SB_FROM];

        if (cssImportDef[SB_NAMED]) {
            cssImportDef[SB_NAMED].split(',').forEach((name) => {
                const parts = name.trim().split(/\s+as\s+/);
                if (parts.length === 1) {
                    namedMap[parts[0]] = parts[0];
                } else if (parts.length === 2) {
                    namedMap[parts[1]] = parts[0];
                }
            });
        }

        for (const key in cssImportDef) {
            const match = key.match(SB_NAMED_MATCHER);
            if (match) {
                namedMap[cssImportDef[key]] = match[1];
            }
        }

        if (SbFrom.charAt(0) === '"' || SbFrom.charAt(0) === "'") {
            SbFrom = SbFrom.slice(1, -1);
        }

        return new Import(SbFrom, cssImportDef[SB_DEFAULT], namedMap);
    }
    containsSymbol(symbol: string): boolean {
        return symbol ? (this.defaultExport === symbol || !!this.named[symbol]) : false;
    }
}
