import {
    Imported,
    isAsset,
    makeAbsolute,
    processDeclarationUrls,
    Stylable,
    StylableMeta
} from '@stylable/core';
import path from 'path';
import webpack from 'webpack';
import { isLoadedByLoaders } from './is-loaded-by-loaders';
import {
    StylableAssetDependency,
    StylableExportsDependency,
    StylableImportDependency
} from './stylable-dependencies';

const stylableExtension = /\.st\.css$/;
export class StylableParser {
    constructor(
        private stylable: Stylable,
        private compilation: webpack.compilation.Compilation,
        private normalModuleFactory: any,
        private useWeakDeps: boolean,
        private useAggressiveDependencies: boolean
    ) {}
    public parse(_source: string, state: any) {
        if (
            isLoadedByLoaders(state.module, () => {
                this.compilation.warnings.push(
                    `Loading a Stylable stylesheet via webpack loaders is not supported` +
                        ` and may cause runtime errors.\n"${state.module.rawRequest}" in "${state.module.issuer.resource}"`
                );
            })
        ) {
            const parser = this.normalModuleFactory.getParser('javascript/auto');
            state.module.type = 'javascript/auto';
            return parser.parse(_source, state);
        }
        const meta = this.stylable.process(state.module.resource);
        state.module.buildInfo.stylableMeta = meta;

        if (meta.mixins.length) {
            // collect assets added through mixins into dependencies
            const { meta: transformedMeta } = this.stylable
                .createTransformer({ postProcessor: undefined, replaceValueHook: undefined })
                .transform(meta);

            const mixinUrls: string[] = [];
            transformedMeta.outputAst!.walkDecls(node =>
                processDeclarationUrls(node, node => node.url && mixinUrls.push(node.url), false)
            );
            state.module.buildInfo.stylableTransformedAst = transformedMeta.outputAst;
            addUrlDependencies(mixinUrls, state.module, this.compilation);
        }

        const fileDeps = state.module.buildInfo.fileDependencies;

        meta.urls
            .filter(url => isAsset(url))
            .forEach(asset => {
                const absPath = makeAbsolute(
                    asset,
                    (this.compilation as any).options.context,
                    path.dirname(state.module.resource)
                );
                fileDeps.add(absPath);
                state.module.addDependency(new StylableAssetDependency(absPath));
            });

        state.module.addDependency(new StylableExportsDependency(['default']));
        meta.imports.forEach(stylableImport => {
            if (isStylableImport(stylableImport)) {
                const importRef = {
                    defaultImport: stylableImport.defaultExport,
                    names: Object.keys(stylableImport.named || {})
                };
                const dep = this.useWeakDeps
                    ? StylableImportDependency.createWeak(
                          stylableImport.fromRelative,
                          state.module,
                          importRef
                      )
                    : new StylableImportDependency(stylableImport.fromRelative, importRef);
                state.module.addDependency(dep);
                this.addStylableFileDependencyChain(meta, stylableImport, fileDeps);
            } else {
                fileDeps.add(
                    this.stylable.resolvePath(stylableImport.context, stylableImport.from)
                );
                // TODO: handle js dependencies?
            }
        });

        return state;
    }
    addStylableFileDependencyChain(
        meta: StylableMeta,
        stylableImport: Imported,
        dependencies = new Set()
    ) {
        const shouldAddDeps = this.useAggressiveDependencies ? true : meta.mixins.length;
        if (
            !dependencies.has(stylableImport.from) &&
            isStylableImport(stylableImport) &&
            shouldAddDeps
        ) {
            try {
                const resource = this.stylable.resolvePath(
                    stylableImport.context,
                    stylableImport.from
                );
                dependencies.add(resource);
                const importedMeta = this.stylable.process(resource);
                meta.imports.forEach(childImport => {
                    this.addStylableFileDependencyChain(importedMeta, childImport, dependencies);
                });
            } catch {
                // maybe remove watch error on deep dependency
                console.warn(`Could not add ${stylableImport.from} to watch dependencies`);
            }
        }
    }
}

function addUrlDependencies(urls: string[], stylableModule: any, compilation: any) {
    urls.filter(url => isAsset(url)).forEach(asset => {
        const absPath = makeAbsolute(
            asset,
            compilation.options.context,
            path.dirname(stylableModule.resource)
        );
        stylableModule.buildInfo.fileDependencies.add(absPath);
        stylableModule.addDependency(new StylableAssetDependency(absPath));
    });
}

function isStylableImport(stylableImport: Imported) {
    return stylableImport.fromRelative.match(stylableExtension);
}
