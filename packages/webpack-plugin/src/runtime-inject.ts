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
import { getStylableBuildData, replaceMappedCSSAssetPlaceholders } from './plugin-utils';
import type {
    BuildData,
    DependencyTemplates,
    RuntimeTemplate,
    StringSortableSet,
    StylableBuildMeta,
} from './types';
import { getReplacementToken } from './loader-utils';
const makeSerializable = require('webpack/lib/util/makeSerializable');

export interface DependencyTemplateContext {
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
        private stylableModules: Map<Module, BuildData | null>,
        private assetsModules: Map<string, NormalModule>,
        private runtimeStylesheetId: 'namespace' | 'module',
        private runtimeId: string,
        private cssInjection: 'js' | 'css' | 'mini-css' | 'none'
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
        const stylableBuildData = getStylableBuildData(this.stylableModules, module);
        if (!stylableBuildData.isUsed) {
            return;
        }
        if (this.cssInjection === 'js') {
            const css = replaceMappedCSSAssetPlaceholders({
                assetsModules: this.assetsModules,
                staticPublicPath: this.staticPublicPath,
                chunkGraph,
                moduleGraph,
                dependencyTemplates,
                runtime,
                runtimeTemplate,
                stylableBuildData,
            });

            if (!(module instanceof NormalModule)) {
                throw new Error(
                    `InjectDependencyTemplate should only be used on stylable modules was found on ${module.identifier()}`
                );
            }

            const id =
                this.runtimeStylesheetId === 'module'
                    ? JSON.stringify(runtimeTemplate.requestShortener.contextify(module.resource))
                    : 'namespace';

            replacePlaceholder(
                source,
                '/* JS_INJECT */',
                `__webpack_require__.sti(${id}, ${JSON.stringify(css)}, ${
                    stylableBuildData.depth
                }, ${JSON.stringify(this.runtimeId)});`
            );
            runtimeRequirements.add(StylableRuntimeInject.name);
        }

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

        if (runtimeRequirements.has(StylableRuntimeStylesheet.name)) {
            /* st */
            replacePlaceholder(source, getReplacementToken('st'), `/*#__PURE__*/ style`);
            /* style */
            replacePlaceholder(
                source,
                getReplacementToken('sts'),
                `/*#__PURE__*/ __webpack_require__.sts.bind(null, namespace)`
            );
            /* cssStates */
            replacePlaceholder(
                source,
                getReplacementToken('stc'),
                `/*#__PURE__*/ __webpack_require__.stc.bind(null, namespace)`
            );
        }

        replacePlaceholder(
            source,
            getReplacementToken('vars'),
            JSON.stringify(stylableBuildData.exports.vars)
        );
        replacePlaceholder(
            source,
            getReplacementToken('stVars'),
            JSON.stringify(stylableBuildData.exports.stVars)
        );
        replacePlaceholder(
            source,
            getReplacementToken('keyframes'),
            JSON.stringify(stylableBuildData.exports.keyframes)
        );
        replacePlaceholder(
            source,
            getReplacementToken('classes'),
            JSON.stringify(stylableBuildData.exports.classes)
        );
        replacePlaceholder(
            source,
            getReplacementToken('namespace'),
            JSON.stringify(stylableBuildData.namespace)
        );
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

export class StylableLoadCSS extends RuntimeModule {
    constructor() {
        super('stylable load css', 10);
    }
    generate() {
        return `${RuntimeGlobals.ensureChunkHandlers}.stcss = ()=>{/*load css for chunk*/}`;
    }
}

function replacePlaceholder(
    source: sources.ReplaceSource,
    replacementPoint: string,
    value: string
) {
    const i = source.source().indexOf(replacementPoint);
    if (!i) {
        throw new Error(`missing ${replacementPoint} from stylable loader source`);
    }
    source.replace(i, i + replacementPoint.length - 1, value, `${replacementPoint}`);
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
