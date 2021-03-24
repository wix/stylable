import type {
    Compiler,
    Compilation,
    Module,
    ModuleGraph,
    NormalModule,
    ChunkGraph,
    sources,
} from 'webpack';

import type {
    DependencyTemplates,
    RuntimeTemplate,
    StringSortableSet,
    StylableBuildMeta,
} from './types';

import { stylesheet, injectStyles } from './runtime';

import { getStylableBuildMeta, replaceMappedCSSAssetPlaceholders } from './plugin-utils';

import { getReplacementToken } from './loader-utils';

const makeSerializable = require('webpack/lib/util/makeSerializable');

const entitiesCache = new WeakMap();

export interface DependencyTemplateContext {
    module: Module;
    moduleGraph: ModuleGraph;
    runtimeRequirements: Set<string>;
    runtimeTemplate: RuntimeTemplate;
    runtime?: string | StringSortableSet;
    chunkGraph: ChunkGraph;
    dependencyTemplates: DependencyTemplates;
}

export function getWebpackEntities(webpack: Compiler['webpack']) {
    const {
        ModuleDependency,
        sources,
        Dependency,
        NormalModule,
        RuntimeModule,
        RuntimeGlobals,
    } = webpack;

    

    let entities = entitiesCache.get(webpack);
    if (entities) {
        return entities;
    }

    class CSSURLDependency extends ModuleDependency {
        constructor(request: string) {
            super(request);
        }

        get type() {
            return 'url()';
        }

        get category() {
            return 'url';
        }
    }

    class UnusedDependency extends ModuleDependency {
        constructor(request: string) {
            super(request);
            this.weak = true;
        }

        get type() {
            return '@st-unused-import';
        }
    }

    class NoOpTemplate {
        apply() {
            /** noop */
        }
    }

    class StylableRuntimeStylesheet extends RuntimeModule {
        constructor() {
            super('stylable stylesheet', 10);
        }
        generate() {
            return `(${stylesheet})(__webpack_require__)`;
        }
    }

    class StylableRuntimeDependency extends Dependency {
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

    class InjectDependencyTemplate {
        constructor(
            private staticPublicPath: string,
            private assetsModules: Map<string, NormalModule>,
            private runtimeStylesheetId: 'namespace' | 'module',
            private runtimeId: string
        ) {}
        apply(
            _dependency: StylableRuntimeDependency,
            source: typeof sources.ReplaceSource,
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
                    throw new Error(
                        `InjectDependencyTemplate should only be used on stylable modules was found on ${module.identifier()}`
                    );
                }

                const id =
                    this.runtimeStylesheetId === 'module'
                        ? JSON.stringify(
                              runtimeTemplate.requestShortener.contextify(module.resource)
                          )
                        : 'namespace';

                replacePlaceholder(
                    source,
                    '/* JS_INJECT */',
                    `__webpack_require__.sti(${id}, ${JSON.stringify(css)}, ${
                        stylableBuildMeta.depth
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
                JSON.stringify(stylableBuildMeta.exports.vars)
            );
            replacePlaceholder(
                source,
                getReplacementToken('stVars'),
                JSON.stringify(stylableBuildMeta.exports.stVars)
            );
            replacePlaceholder(
                source,
                getReplacementToken('keyframes'),
                JSON.stringify(stylableBuildMeta.exports.keyframes)
            );
            replacePlaceholder(
                source,
                getReplacementToken('classes'),
                JSON.stringify(stylableBuildMeta.exports.classes)
            );
            replacePlaceholder(
                source,
                getReplacementToken('namespace'),
                JSON.stringify(stylableBuildMeta.namespace)
            );
        }
    }

    class StylableRuntimeInject extends RuntimeModule {
        constructor() {
            super('stylable inject', 10);
        }
        generate() {
            return `(${injectStyles})(__webpack_require__)`;
        }
    }

    function injectRuntimeModules(name: string, compilation: Compilation) {
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
    makeSerializable(UnusedDependency, __filename, UnusedDependency.name);
    makeSerializable(CSSURLDependency, __filename, CSSURLDependency.name);

    entities = {
        injectRuntimeModules,
        StylableRuntimeInject,
        InjectDependencyTemplate,
        StylableRuntimeDependency,
        StylableRuntimeStylesheet,
        CSSURLDependency,
        NoOpTemplate,
    };

    entitiesCache.set(webpack, entities);

    return entities;
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
