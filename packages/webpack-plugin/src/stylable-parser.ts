import {
    Imported,
    isAsset,
    makeAbsolute,
    processDeclarationUrls,
    Stylable,
    StylableResults
} from '@stylable/core';
import path from 'path';
import webpack from 'webpack';
import { isLoadedByLoaders } from './is-loaded-by-loaders';
import {
    StylableAssetDependency,
    StylableExportsDependency,
    StylableImportDependency
} from './stylable-dependencies';
import { StylableModule } from './types';

const stylableExtension = /\.st\.css$/;
export class StylableParser {
    constructor(
        private stylable: Stylable,
        private compilation: webpack.compilation.Compilation,
        private normalModuleFactory: any,
        private useWeakDeps: boolean
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

        const currentModule: StylableModule = state.module;
        const context = (this.compilation as any).options.context;
        const fileDeps = currentModule.buildInfo.fileDependencies;
        const meta = this.stylable.process(currentModule.resource);

        const res = this.stylable.createTransformer().transform(meta);

        currentModule.buildInfo.stylableMeta = meta;
        currentModule.buildInfo.stylableTransformedAst = res.meta.outputAst!;
        currentModule.buildInfo.stylableTransformedExports = res.exports;

        currentModule.addDependency(new StylableExportsDependency(['default']));

        handleUrlDependencies(res, currentModule, context);

        meta.imports.forEach(stylableImport => {
            if (isStylableImport(stylableImport)) {
                addStylableImportsDependencies(
                    this.stylable,
                    this.useWeakDeps,
                    stylableImport,
                    currentModule,
                    fileDeps
                );
            } else {
                // TODO: handle deep js dependencies?
                fileDeps.add(
                    this.stylable.resolvePath(stylableImport.context, stylableImport.from)
                );
            }
        });

        return state;
    }
}

function addStylableImportsDependencies(
    stylable: Stylable,
    useWeakDeps: boolean,
    stylableImport: Imported,
    currentModule: StylableModule,
    fileDeps: Set<string>
) {
    const importRef = {
        defaultImport: stylableImport.defaultExport,
        names: Object.keys(stylableImport.named || {})
    };
    const dep = useWeakDeps
        ? StylableImportDependency.createWeak(stylableImport.fromRelative, currentModule, importRef)
        : new StylableImportDependency(stylableImport.fromRelative, importRef);
    currentModule.addDependency(dep);
    addStylableFileDependencyChain(stylable, stylableImport, fileDeps);
}

function addStylableFileDependencyChain(
    stylable: Stylable,
    stylableImport: Imported,
    dependencies = new Set()
) {
    const resource = stylable.resolvePath(stylableImport.context, stylableImport.from);
    if (!dependencies.has(resource) && isStylableImport(stylableImport)) {
        try {
            dependencies.add(resource);
            stylable.process(resource).imports.forEach(childImport => {
                addStylableFileDependencyChain(stylable, childImport, dependencies);
            });
        } catch {
            // maybe remove watch error on deep dependency
            console.warn(`Could not add ${stylableImport.from} to watch dependencies`);
        }
    }
}

function handleUrlDependencies(res: StylableResults, currentModule: StylableModule, context: any) {
    const urls: string[] = [];
    res.meta.outputAst!.walkDecls(node =>
        processDeclarationUrls(node, node => node.url && urls.push(node.url), false)
    );
    addUrlDependencies(urls, currentModule, context);
}

function addUrlDependencies(urls: string[], stylableModule: StylableModule, rootContext: string) {
    urls.filter(url => isAsset(url)).forEach(asset => {
        const absPath = makeAbsolute(asset, rootContext, path.dirname(stylableModule.resource));
        stylableModule.buildInfo.fileDependencies.add(absPath);
        stylableModule.addDependency(new StylableAssetDependency(absPath));
    });
}

function isStylableImport(stylableImport: Imported) {
    return stylableImport.fromRelative.match(stylableExtension);
}
