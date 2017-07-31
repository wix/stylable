
import { Import } from './import';
import { Stylesheet } from './stylesheet';
import { Pojo } from './types';
import { valueMapping } from './stylable-value-parsers';
import { valueTemplate } from './value-template';
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
    resolve(sheet: Stylesheet, name: string) {
        const typedClass = sheet.typedClasses[name];
        const _import = typedClass ? Import.findImportForSymbol(sheet.imports, typedClass[valueMapping.extends] || "") : null;
        if(_import){
            const m = this.resolveModule(_import.from);
            const extendsName = typedClass[valueMapping.extends];
            if(_import.defaultExport === extendsName){
                return m.default || m;
            } else {
                return m[_import.named[extendsName!]]
            }
        }
        return sheet;
    }
    resolveImports(sheet: Stylesheet) {
        //TODO: add support __esModule support?
        const imports = sheet.imports.reduce((acc, importDef) => {
            const resolved = this.resolveModule(importDef.from);
            acc[importDef.defaultExport || importDef.from] = resolved.default || resolved;
            const isStylesheet = Stylesheet.isStylesheet(resolved);
            for (const name in importDef.named) {
                acc[name] = isStylesheet ? valueTemplate(resolved.vars[name], resolved.vars) : resolved[name];
            }
            return acc;
        }, {} as Pojo);
        return imports;
    }
    resolveSymbols(sheet: Stylesheet) {
        //TODO: add keyframes
        const symbols = this.resolveImports(sheet);
        for (const varName in sheet.vars) {
            if (symbols[varName]) {
                throw Error(`resolveSymbols: Name ${varName} already set`);
            }
            symbols[varName] = sheet.vars[varName];
        }
        return symbols;
    }
}
