import { StylableModule } from './types';

const NullDependency = require('webpack/lib/dependencies/NullDependency');
const ModuleDependency = require('webpack/lib/dependencies/ModuleDependency');

export interface ImportDefinition {
    defaultImport: string;
    names: string[];
}

export class StylableExportsDependency extends NullDependency {
    constructor(private exports: any) {
        super();
        this.exports = exports;
    }

    get type() {
        return 'stylable exports';
    }

    public getExports() {
        return {
            exports: this.exports
        };
    }
}

export class StylableImportDependency extends ModuleDependency {
    get type() {
        return 'stylable import';
    }

    public static createWeak(request: string, originModule: StylableModule, importDef: ImportDefinition) {
        const dep = new StylableImportDependency(request, importDef);
        dep.weak = true;
        dep.originModule = originModule;
        return dep;
    }
    public module!: StylableModule;
    private names: string[];
    private weak?: boolean;

    constructor(request: string, { defaultImport, names }: ImportDefinition) {
        super(request);
        this.defaultImport = defaultImport;
        this.names = names;
    }

    public getReference() {
        if (!this.module) { return null; }
        return {
            weak: this.weak,
            module: this.module,
            importedNames: this.defaultImport ? ['default'].concat(this.names) : this.names.slice()
        };
    }

    public updateHash(hash: any) {
        super.updateHash(hash);
        hash.update('stylable ' + (this.module && this.module.hash));
    }
}

export class StylableAssetDependency extends ModuleDependency {
    constructor(request: string) {
        super(request);
    }

    get type() {
        return 'stylable asset import';
    }
}
