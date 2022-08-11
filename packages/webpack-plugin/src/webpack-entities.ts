import type {
    Compiler,
    Module,
    ModuleGraph,
    NormalModule,
    ChunkGraph,
    sources,
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

import { getStylableBuildData, replaceMappedCSSAssetPlaceholders } from './plugin-utils';
import { getReplacementTokenJSON as rtJSON } from './loader-utils';

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

type DependencyTemplate = InstanceType<typeof dependencies.ModuleDependency['Template']>;

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
    InjectDependencyTemplate: InjectDependencyTemplate;
    StylableRuntimeDependency: StylableRuntimeDependency;
    CSSURLDependency: typeof dependencies.ModuleDependency;
    NoopTemplate: typeof dependencies.ModuleDependency.Template;
    UnusedDependency: typeof dependencies.ModuleDependency;
    ModuleDependency: typeof dependencies.ModuleDependency;
}

export function getWebpackEntities(webpack: Compiler['webpack']): StylableWebpackEntities {
    const {
        dependencies: { ModuleDependency },
        Dependency,
        NormalModule,
    } = webpack;
    let entities = entitiesCache.get(webpack);
    if (entities) {
        return entities;
    }

    class CSSURLDependency extends ModuleDependency {
        // @ts-expect-error webpack types are wrong consider this as property
        get type() {
            return 'url()';
        }
        // @ts-expect-error webpack types are wrong consider this as property
        get category() {
            return 'url';
        }
    }

    class UnusedDependency extends ModuleDependency {
        weak = true;
        // @ts-expect-error webpack types are wrong consider this as property
        get type() {
            return '@st-unused-import';
        }
        // @ts-expect-error webpack types are wrong consider this as property
        get category() {
            return 'esm';
        }
    }

    class NoopTemplate {
        apply() {
            /** noop */
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
            const { exports, namespace, depth } = stylableBuildData;
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
                        : JSON.stringify(namespace);

                replacePlaceholder(source, rtJSON('id'), id);
                replacePlaceholder(source, rtJSON('css'), JSON.stringify(css));
                replacePlaceholder(source, rtJSON('depth'), String(depth));
                replacePlaceholder(source, rtJSON('runtimeId'), JSON.stringify(this.runtimeId));
            }

            replacePlaceholder(source, rtJSON('vars'), JSON.stringify(exports.vars));
            replacePlaceholder(source, rtJSON('stVars'), JSON.stringify(exports.stVars));
            replacePlaceholder(source, rtJSON('layers'), JSON.stringify(exports.layers));
            replacePlaceholder(source, rtJSON('keyframes'), JSON.stringify(exports.keyframes));
            replacePlaceholder(source, rtJSON('classes'), JSON.stringify(exports.classes));
            replacePlaceholder(source, rtJSON('namespace'), JSON.stringify(namespace));
        }
    }

    registerSerialization(
        webpack,
        StylableRuntimeDependency,
        (ctx) => [ctx.read()] as [StylableBuildMeta]
    );

    /* The request is empty for both dependencies and it will be overridden by the de-serialization process */
    registerSerialization(webpack, UnusedDependency, () => [''] as [string]);
    registerSerialization(webpack, CSSURLDependency, () => [''] as [string]);

    entities = {
        InjectDependencyTemplate,
        StylableRuntimeDependency,
        CSSURLDependency,
        NoopTemplate,
        UnusedDependency,
        ModuleDependency,
    };

    entitiesCache.set(webpack, entities);

    return entities;
}

function replacePlaceholder(
    source: sources.ReplaceSource,
    replacementPoint: string,
    value: string
) {
    // we calculate the replacement from the original source. this way order does not matter 
    const t: any = source.original();
    const t1 = t.source ? t.source() : String(t);
    const i = t1.indexOf(replacementPoint);
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
