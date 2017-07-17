
import { Import } from './import';
import { Stylesheet } from './stylesheet';
import { Pojo } from './types';
import { valueMapping } from './stylable-value-parsers';

export interface Module {
    default: any;
    [key: string]: any;
}

export class Resolver {
    //TODO: replace any with Module
    private zMap: Pojo<any> = {};
    constructor(initialMap: Pojo<any>) {
        this.zMap = { ...initialMap };
    }
    add(name: string, value: any) {
        this.zMap[name] = value;
    }
    resolveModule(path: string) {
        const value = this.zMap[path];
        if (!value) {
            throw new Error("can't resolve " + path);
        }
        return value;
    }
    getImportForSymbol(sheet: Stylesheet, symbol: string) {
        return sheet.imports.filter((_import: Import) => _import.containsSymbol(symbol))[0] || null;
    }
    resolve(sheet: Stylesheet, name: string) {
        const typedClass = sheet.typedClasses[name];
        const _import = typedClass ? this.getImportForSymbol(sheet, typedClass[valueMapping.type] || "") : null;
        return _import ? this.resolveModule(_import.from) : sheet;
    }
    resolveSymbols(sheet: Stylesheet) {
        //TODO: add support __esModule support?
        const imports = sheet.imports.reduce((acc, importDef) => {
            const resolved = this.resolveModule(importDef.from);
            acc[importDef.defaultExport || importDef.from] = resolved.default || resolved;
            const isStylesheet = Stylesheet.isStylesheet(resolved);
            for (const name in importDef.named) {
                acc[name] = isStylesheet ? resolved.vars[name] : resolved[name];
            }
            return acc;
        }, {} as Pojo);

        const symbols = { ...imports };

        for (const varName in sheet.vars) {
            if (symbols[varName]) {
                throw Error(`resolveSymbols: Name ${varName} already set`);
            }
            symbols[varName] = sheet.vars[varName];
        }

        return symbols;
    }
}
