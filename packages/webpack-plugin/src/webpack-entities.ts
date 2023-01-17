import type {
    Compiler,
    Compilation,
    Module,
    ModuleGraph,
    NormalModule,
    ChunkGraph,
    sources,
    RuntimeModule,
    Dependency,
    dependencies,
} from 'webpack';
import type {
    BuildData,
    DependencyTemplates,
    RuntimeTemplate,
    StringSortableSet,
    StylableBuildMeta,
} from './types';
import { stylesheet } from '@stylable/runtime';
import { injectStyles } from '@stylable/runtime/dist/index-internal';

import { getStylableBuildData, replaceMappedCSSAssetPlaceholders } from './plugin-utils';
import { getReplacementToken } from './loader-utils';

const entitiesCache = new WeakMap<Compiler['webpack'], StylableWebpackEntities>();

export interface DependencyTemplateContext {
    module: Module;
    moduleGraph: ModuleGraph;
    runtimeRequirements: Set<string>;
    runtimeTemplate: RuntimeTemplate;
    runtime?: string | StringSortableSet;
    chunkGraph: ChunkGraph;
    dependencyTemplates: DependencyTemplates;
}

type DependencyTemplate = InstanceType<(typeof dependencies.ModuleDependency)['Template']>;

interface InjectDependencyTemplate {
    new (
        staticPublicPath: string,
        stylableModules: Map<Module, BuildData | null>,
        assetsModules: Map<string, NormalModule>,
        runtimeStylesheetId: 'namespace' | 'module',
        runtimeId: string,
        cssInjection: 'js' | 'css' | 'mini-css' | 'none'
    ): DependencyTemplate;
}

interface StylableRuntimeDependency {
    new (stylableBuildMeta: StylableBuildMeta): Dependency;
}

export interface StylableWebpackEntities {
    injectRuntimeModules: (name: string, compilation: Compilation) => void;
    StylableRuntimeInject: typeof RuntimeModule;
    InjectDependencyTemplate: InjectDependencyTemplate;
    StylableRuntimeDependency: StylableRuntimeDependency;
    StylableRuntimeStylesheet: typeof RuntimeModule;
    CSSURLDependency: typeof dependencies.ModuleDependency;
    NoopTemplate: typeof dependencies.ModuleDependency.Template;
    UnusedDependency: typeof dependencies.HarmonyImportDependency;
}

export function getWebpackEntities(webpack: Compiler['webpack']): StylableWebpackEntities {
    const {
        dependencies: { ModuleDependency, HarmonyImportDependency },
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
        get type() {
            return 'url()';
        }
        get category() {
            return 'url';
        }
    }

    class UnusedDependency extends HarmonyImportDependency {
        weak = true;
        get type() {
            return '@st-unused-import';
        }
        get category() {
            return 'esm';
        }
    }

    class NoopTemplate {
        apply() {
            /** noop */
        }
    }

    class StylableRuntimeStylesheet extends RuntimeModule {
        constructor() {
            super('stylable stylesheet', RuntimeModule.STAGE_NORMAL);
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
        serialize(context: any) {
            context.write(this.stylableBuildMeta);
            super.serialize(context);
        }
    }

    class InjectDependencyTemplate {
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
            /**
             * NOTICE: replace assumes changes are done from bottom->top
             * replace out of order might cause issues!
             * the order is coupled with "loader.ts".
             */
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
                        ? JSON.stringify(
                              runtimeTemplate.requestShortener.contextify(module.resource)
                          )
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
                getReplacementToken('containers'),
                JSON.stringify(stylableBuildData.exports.containers)
            );
            replacePlaceholder(
                source,
                getReplacementToken('layers'),
                JSON.stringify(stylableBuildData.exports.layers)
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

    class StylableRuntimeInject extends RuntimeModule {
        constructor() {
            super('stylable inject', RuntimeModule.STAGE_NORMAL);
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

    registerSerialization(
        webpack,
        StylableRuntimeDependency,
        (ctx) => [ctx.read()] as [StylableBuildMeta]
    );

    /* The request is empty for both dependencies and it will be overridden by the de-serialization process */
    registerSerialization(
        webpack,
        UnusedDependency,
        () => ['', 0, undefined] as [string, number, undefined]
    );
    registerSerialization(webpack, CSSURLDependency, () => [''] as [string]);

    entities = {
        injectRuntimeModules,
        StylableRuntimeInject,
        InjectDependencyTemplate,
        StylableRuntimeDependency,
        StylableRuntimeStylesheet,
        CSSURLDependency,
        NoopTemplate,
        UnusedDependency,
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

type SerializationContext = any;
type Serializable = {
    new (...args: any[]): {
        serialize: (ctx: SerializationContext) => void;
        deserialize: (ctx: SerializationContext) => void;
    };
};

function registerSerialization<T extends Serializable>(
    webpack: Compiler['webpack'],
    Type: T,
    getArgs: (context: SerializationContext) => ConstructorParameters<T>
) {
    webpack.util.serialization.register(Type, __filename, Type.name, {
        serialize(instance: InstanceType<T>, context: SerializationContext) {
            instance.serialize(context);
        },
        deserialize(context: SerializationContext) {
            const instance = new Type(...getArgs(context));
            instance.deserialize(context);
            return instance;
        },
    });
}
