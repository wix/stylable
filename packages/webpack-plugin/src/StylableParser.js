const { isLoadedByLoaders } = require('./isLoadedByLoaders');
const path = require('path');
const CommonJsRequireDependency = require('webpack/lib/dependencies/CommonJsRequireDependency');
const RequireHeaderDependency = require('webpack/lib/dependencies/RequireHeaderDependency');
const { rendererDependency, stylesheetDependency } = require('./runtime-dependencies');
const {
    StylableExportsDependency,
    StylableImportDependency,
    StylableAssetDependency
} = require('./StylableDependencies');
const { isAsset, makeAbsolute } = require('@stylable/core');

const stylableExtension = /\.st\.css$/;

class StylableParser {
    constructor(stylable, compilation) {
        this.stylable = stylable;
        this.compilation = compilation;
    }
    parse(source, state) {
        const currentModule = state.module;
        if (
            isLoadedByLoaders(currentModule, () => {
                this.compilation.warnings.push(
                    `Loading a Stylable stylesheet via webpack loaders is not supported and may cause runtime errors.\n"${
                        currentModule.rawRequest
                    }" in "${currentModule.issuer.resource}"`
                );
            })
        ) {
            return state;
        }
        const meta = this.stylable.process(currentModule.resource);
        currentModule.buildInfo.stylableMeta = meta;
        // currentModule.buildMeta.exportsType = "namespace";
        meta.urls.filter(url => isAsset(url)).forEach(asset => {
            const absPath = makeAbsolute(
                asset,
                this.compilation.options.context,
                path.dirname(currentModule.resource)
            );
            currentModule.buildInfo.fileDependencies.add(absPath);
            currentModule.addDependency(new StylableAssetDependency(absPath));
        });

        currentModule.addDependency(new StylableExportsDependency(['default']));
        currentModule.addDependency(stylesheetDependency());
        currentModule.addDependency(rendererDependency());

        meta.imports.forEach(stylableImport => {
            currentModule.buildInfo.fileDependencies.add(stylableImport.from);
            if (stylableImport.fromRelative.match(stylableExtension)) {
                currentModule.addDependency(
                    new StylableImportDependency(stylableImport.fromRelative, {
                        defaultImport: stylableImport.defaultExport,
                        names: []
                    }, false)
                );
                this.addChildDeps(stylableImport, currentModule);
            }
            //TODO: handle js dependencies?
        });

        return state;
    }
    addChildDeps(stylableImport, module) {
        try {
            this.stylable.process(stylableImport.from).imports.forEach(childImport => {
                const fileDependencies = module.buildInfo.fileDependencies;
                if (childImport.fromRelative.match(stylableExtension)) {
                    if (!fileDependencies.has(childImport.from)) {
                        fileDependencies.add(childImport.from);
                        this.addChildDeps(childImport, module);
                    }
                }
            });
        } catch (e) {
            // console.log('addChildDeps', e)
        }
    }
}

module.exports = StylableParser;
