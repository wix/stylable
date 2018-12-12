const NullDependency = require('webpack/lib/dependencies/NullDependency');
const ModuleDependency = require('webpack/lib/dependencies/ModuleDependency');

class StylableExportsDependency extends NullDependency {
    constructor(exports) {
        super();
        this.exports = exports;
    }

    get type() {
        return 'stylable exports';
    }

    getExports() {
        return {
            exports: this.exports
        };
    }
}

class StylableImportDependency extends ModuleDependency {
    static createWeak(request, originModule, importDef) {
        const dep = new StylableImportDependency(request, importDef);
        dep.weak = true;
        dep.originModule = originModule;
        return dep;
    }
    constructor(request, { defaultImport, names }) {
        super(request);
        this.defaultImport = defaultImport;
        this.names = names;
    }

    getReference() {
        if (!this.module) return null;
        return {
            weak: this.weak,
            module: this.module,
            importedNames: this.defaultImport ? ['default'].concat(this.names) : this.names.slice()
        };
    }

    updateHash(hash) {
        super.updateHash(hash);
        hash.update('stylable ' + (this.module && this.module.hash));
    }

    get type() {
        return 'stylable import';
    }
}

class StylableAssetDependency extends ModuleDependency {
    constructor(request) {
        super(request);
    }

    get type() {
        return 'stylable asset import';
    }
}

module.exports.StylableAssetDependency = StylableAssetDependency;
module.exports.StylableImportDependency = StylableImportDependency;
module.exports.StylableExportsDependency = StylableExportsDependency;
