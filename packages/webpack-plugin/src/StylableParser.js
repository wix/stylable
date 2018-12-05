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
    constructor(stylable, compilation, useWeakDeps) {
        this.stylable = stylable;
        this.compilation = compilation;
        this.useWeakDeps = useWeakDeps;
    }
    parse(source, state) {
        if (
            isLoadedByLoaders(state.module, () => {
                this.compilation.warnings.push(
                    `Loading a Stylable stylesheet via webpack loaders is not supported and may cause runtime errors.\n"${
                        state.module.rawRequest
                    }" in "${state.module.issuer.resource}"`
                );
            })
        ) {
            return state;
        }
        const meta = this.stylable.process(state.module.resource);
        state.module.buildInfo.stylableMeta = meta;
        // state.module.buildMeta.exportsType = "namespace";
        meta.urls
            .filter(url => isAsset(url))
            .forEach(asset => {
                const absPath = makeAbsolute(
                    asset,
                    this.compilation.options.context,
                    path.dirname(state.module.resource)
                );
                state.module.buildInfo.fileDependencies.add(absPath);
                state.module.addDependency(new StylableAssetDependency(absPath));
            });

        state.module.addDependency(new StylableExportsDependency(['default']));
        state.module.addDependency(stylesheetDependency());
        state.module.addDependency(rendererDependency());

        meta.imports.forEach(stylableImport => {
            state.module.buildInfo.fileDependencies.add(stylableImport.from);
            if (stylableImport.fromRelative.match(stylableExtension)) {
                const importRef = {
                    defaultImport: stylableImport.defaultExport,
                    names: []
                };
                const dep = this.useWeakDeps
                    ? StylableImportDependency.createWeak(
                          stylableImport.fromRelative,
                          state.module,
                          importRef
                      )
                    : new StylableImportDependency(stylableImport.fromRelative, importRef);
                state.module.addDependency(dep);
                this.addChildDeps(stylableImport);
            }
            //TODO: handle js dependencies?
        });

        return state;
    }
    addChildDeps(stylableImport) {
        try {
            this.stylable.process(stylableImport.from).imports.forEach(childImport => {
                const fileDependencies = state.module.buildInfo.fileDependencies;
                if (childImport.fromRelative.match(stylableExtension)) {
                    if (!fileDependencies.has(childImport.from)) {
                        fileDependencies.add(childImport.from);
                        this.addChildDeps(childImport, this.stylable);
                    }
                }
            });
        } catch (e) {}
    }
}

module.exports = StylableParser;
