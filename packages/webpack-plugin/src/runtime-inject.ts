import { stylesheet, injectStyles } from './runtime';

import {
    RuntimeModule,
    RuntimeGlobals,
    Compilation,
    Dependency,
    Module,
    ModuleGraph,
    NormalModule,
    sources,
    ChunkGraph,
} from 'webpack';
import { getStylableBuildMeta, replaceMappedCSSAssetPlaceholders } from './plugin-utils';
import {
    DependencyTemplates,
    RuntimeTemplate,
    StringSortableSet,
    StylableBuildMeta,
} from './types';
const makeSerializable = require('webpack/lib/util/makeSerializable');

interface DependencyTemplateContext {
    module: Module;
    moduleGraph: ModuleGraph;
    runtimeRequirements: Set<string>;
    runtimeTemplate: RuntimeTemplate;
    runtime?: string | StringSortableSet;
    chunkGraph: ChunkGraph;
    dependencyTemplates: DependencyTemplates;
}

export class StylableRuntimeDependency extends Dependency {
    constructor(private stylableBuildMeta: StylableBuildMeta) {
        super();
    }
    updateHash(hash: any) {
        hash.update(JSON.stringify(this.stylableBuildMeta));
    }

    serialize({ write }: any) {
        write(this.stylableBuildMeta);
    }

    deserialize({ read }: any) {
        this.stylableBuildMeta = read();
    }
}

export class InjectDependencyTemplate {
    constructor(
        private staticPublicPath: string,
        private assetsModules: Map<string, NormalModule>,
        private runtimeStylesheetId: 'namespace' | 'module',
        private runtimeId: string
    ) {}
    apply(
        _dependency: StylableRuntimeDependency,
        source: sources.ReplaceSource,
        {
            module,
            runtimeRequirements,
            runtimeTemplate,
            moduleGraph,
            runtime,
            chunkGraph,
            dependencyTemplates,
        }: DependencyTemplateContext
    ) {
        const stylableBuildMeta = getStylableBuildMeta(module);
        if (!stylableBuildMeta.isUsed) {
            return;
        }
        if (stylableBuildMeta.cssInjection === 'js') {
            const css = replaceMappedCSSAssetPlaceholders({
                assetsModules: this.assetsModules,
                staticPublicPath: this.staticPublicPath,
                chunkGraph,
                moduleGraph,
                dependencyTemplates,
                runtime,
                runtimeTemplate,
                stylableBuildMeta,
            });

            if (!(module instanceof NormalModule)) {
                throw new Error('InjectDependencyTemplate should only be used on stylable modules');
            }

            const id =
                this.runtimeStylesheetId === 'module'
                    ? JSON.stringify(runtimeTemplate.requestShortener.contextify(module.resource))
                    : 'namespace';

            source.insert(
                source.size(),
                `__webpack_require__.sti(${id}, ${JSON.stringify(css)}, ${
                    stylableBuildMeta.depth
                }, ${JSON.stringify(this.runtimeId)});`,
                StylableRuntimeDependency.name
            );
            runtimeRequirements.add(StylableRuntimeInject.name);
        }

        replacePlaceholderExport(source, `{__classes__:true}`, stylableBuildMeta.exports.classes);
        replacePlaceholderExport(source, `{__namespace__:true}`, stylableBuildMeta.namespace);

        const usedExports = moduleGraph.getUsedExports(module, runtime);
        if (typeof usedExports === 'boolean') {
            if (usedExports) {
                runtimeRequirements.add(StylableRuntimeStylesheet.name);
            }
        } else if (!usedExports) {
            runtimeRequirements.add(StylableRuntimeStylesheet.name);
        } else if (
            usedExports.has('st') ||
            usedExports.has('style') ||
            usedExports.has('cssStates')
        ) {
            runtimeRequirements.add(StylableRuntimeStylesheet.name);
        }
    }
}

export class StylableRuntimeStylesheet extends RuntimeModule {
    constructor() {
        super('stylable stylesheet', 10);
    }
    generate() {
        return `(${stylesheet})(__webpack_require__)`;
    }
}

export class StylableRuntimeInject extends RuntimeModule {
    constructor() {
        super('stylable inject', 10);
    }
    generate() {
        return `(${injectStyles})(__webpack_require__)`;
    }
}

export class LoadCSS extends RuntimeModule {
    constructor() {
        super('stylable load css', 10);
    }
    generate() {
        return `${RuntimeGlobals.ensureChunkHandlers}.stcss = ()=>{/*load css for chunk*/}`;
    }
}

function replacePlaceholderExport(
    source: sources.ReplaceSource,
    replacementPoint: string,
    value: string | Record<string, string>
) {
    const i = source.source().indexOf(replacementPoint);
    if (!i) {
        throw new Error(`missing ${replacementPoint} from stylable loader source`);
    }
    source.replace(
        i,
        i + replacementPoint.length - 1,
        JSON.stringify(value),
        `${replacementPoint} optimizations`
    );
}

export function injectRuntimeModules(name: string, compilation: Compilation) {
    compilation.hooks.runtimeRequirementInModule
        .for(StylableRuntimeInject.name)
        .tap(name, (_module, set) => {
            set.add(RuntimeGlobals.require);
        });

    compilation.hooks.runtimeRequirementInModule
        .for(StylableRuntimeStylesheet.name)
        .tap(name, (_module, set) => {
            set.add(RuntimeGlobals.require);
        });

    compilation.hooks.runtimeRequirementInTree
        .for(StylableRuntimeInject.name)
        .tap(name, (chunk, _set) => {
            compilation.addRuntimeModule(chunk, new StylableRuntimeInject());
        });

    compilation.hooks.runtimeRequirementInTree
        .for(StylableRuntimeStylesheet.name)
        .tap(name, (chunk, _set) => {
            compilation.addRuntimeModule(chunk, new StylableRuntimeStylesheet());
        });
}

makeSerializable(StylableRuntimeDependency, __filename, StylableRuntimeDependency.name);
