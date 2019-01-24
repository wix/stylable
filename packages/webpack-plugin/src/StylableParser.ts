import { Imported, isAsset, makeAbsolute, Stylable } from '@stylable/core';
import path from 'path';
import webpack from 'webpack';
import { isLoadedByLoaders } from './isLoadedByLoaders';
import { StylableAssetDependency, StylableExportsDependency, StylableImportDependency } from './StylableDependencies';

const stylableExtension = /\.st\.css$/;

export class StylableParser {
    constructor(
        private stylable: Stylable,
        private compilation: webpack.compilation.Compilation,
        private useWeakDeps: boolean
    ) {
    }
    public parse(_source: string, state: any) {
        if (
            isLoadedByLoaders(state.module, () => {
                this.compilation.warnings.push(
                    `Loading a Stylable stylesheet via webpack loaders is not supported` +
                    ` and may cause runtime errors.\n"${
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
                    (this.compilation as any).options.context,
                    path.dirname(state.module.resource)
                );
                state.module.buildInfo.fileDependencies.add(absPath);
                state.module.addDependency(new StylableAssetDependency(absPath));
            });

        state.module.addDependency(new StylableExportsDependency(['default']));

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
            // TODO: handle js dependencies?
        });

        return state;
    }
    public addChildDeps(stylableImport: Imported) {
        try {
            this.stylable.process(stylableImport.from);
            // .imports.forEach(childImport => {
            // const fileDependencies = state.module.buildInfo.fileDependencies;
            // if (childImport.fromRelative.match(stylableExtension)) {
            //     if (!fileDependencies.has(childImport.from)) {
            //         fileDependencies.add(childImport.from);
            //         this.addChildDeps(childImport/*, this.stylable*/);
            //     }
            // }
            // });
        } catch {
            /* */
        }
    }
}
