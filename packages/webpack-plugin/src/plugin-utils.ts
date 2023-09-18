import type {
    Chunk,
    ChunkGraph,
    Compilation,
    Compiler,
    dependencies,
    Module,
    ModuleGraph,
    NormalModule,
} from 'webpack';

import type {
    BuildData,
    DependencyTemplates,
    EntryPoint,
    RuntimeTemplate,
    StringSortableSet,
    StylableBuildMeta,
    WebpackCreateHash,
    WebpackOutputOptions,
} from './types';
import type { IStylableOptimizer, StylableResolverCache } from '@stylable/core/dist/index-internal';
import decache from 'decache';
import { CalcDepthContext, getCSSViewModule } from '@stylable/build-tools';
import { join, parse } from 'path';
import { ReExt } from './re-ext-plugin';

export function* uniqueFilterMap<T, O = T>(
    iter: Iterable<T>,
    map = (item: T): O => item as unknown as O,
    filter = (item: O): item is NonNullable<O> => item !== undefined && item !== null
) {
    const s = new Set();
    for (const item of iter) {
        const mapped = map(item);
        if (!filter(mapped)) {
            continue;
        }
        if (s.has(mapped)) {
            continue;
        }
        yield mapped;
        s.add(mapped);
    }
}

export function isSameResourceModule(moduleA: any, moduleB: any) {
    return moduleA.resource === moduleB.resource;
}

export function isStylableModule(module: any): module is NormalModule {
    return module?.resource?.endsWith('.st.css');
}
export function isLoadedNativeCSSModule(
    module: any,
    moduleGraph: ModuleGraph
): module is NormalModule {
    return module.resource?.endsWith('.css') && isStylableModule(moduleGraph.getIssuer(module));
}

export function isAssetModule(module: Module): module is NormalModule {
    return module.type.startsWith('asset/') || module.type === 'asset';
}

export function getStaticPublicPath(compilation: Compilation) {
    let publicPath = '';
    if (typeof compilation.outputOptions.publicPath === 'string') {
        publicPath = compilation.outputOptions.publicPath;
        publicPath = publicPath === 'auto' ? '' : publicPath;
        publicPath = publicPath === '' || publicPath.endsWith('/') ? publicPath : publicPath + '/';
    } else {
        throw new Error('Public path as function is not supported yet.');
    }
    return publicPath;
}

export function replaceCSSAssetPlaceholders(
    { css, urls }: BuildData,
    publicPath: string,
    getAssetOutputPath: (resourcePath: string, publicPath: string) => string
) {
    return css.replace(/__stylable_url_asset_(\d+?)__/g, (_match, index) =>
        getAssetOutputPath(urls[Number(index)], publicPath)
    );
}

interface ReplaceMappedCSSAssetPlaceholdersOptions {
    stylableBuildData: BuildData;
    staticPublicPath: string;
    assetsModules: Map<string, NormalModule>;
    chunkGraph: ChunkGraph;
    moduleGraph: ModuleGraph;
    runtime?: string | StringSortableSet;
    runtimeTemplate: RuntimeTemplate;
    dependencyTemplates: DependencyTemplates;
}

export function replaceMappedCSSAssetPlaceholders({
    stylableBuildData,
    staticPublicPath,
    assetsModules,
    chunkGraph,
    moduleGraph,
    runtime,
    runtimeTemplate,
    dependencyTemplates,
}: ReplaceMappedCSSAssetPlaceholdersOptions) {
    return replaceCSSAssetPlaceholders(
        stylableBuildData,
        staticPublicPath,
        (resourcePath, publicPath) => {
            const assetModule = assetsModules.get(resourcePath);
            if (!assetModule) {
                throw new Error('Missing asset module for ' + resourcePath);
            }
            if (isLoadedWithKnownAssetLoader(assetModule)) {
                return extractFilenameFromAssetModule(assetModule, publicPath);
            } else {
                const data = new Map<string, unknown>();
                const assetModuleSource = assetModule.generator.generate(assetModule, {
                    chunkGraph,
                    moduleGraph,
                    runtime,
                    runtimeRequirements: new Set(),
                    runtimeTemplate,
                    dependencyTemplates,
                    type: 'asset/resource',
                    getData: () => data,
                });

                if (!assetModule.buildInfo) {
                    throw new Error('Missing asset module build info for ' + resourcePath);
                }

                if (assetModule.buildInfo.dataUrl) {
                    // Investigate using the data map from getData currently there is an unknown in term from escaping keeping extractDataUrlFromAssetModuleSource
                    return extractDataUrlFromAssetModuleSource(
                        assetModuleSource.source().toString()
                    );
                }

                return publicPath + assetModule.buildInfo.filename;
            }
        }
    );
}

export function extractFilenameFromAssetModule(module: NormalModule, publicPath: string): string {
    const source = module.originalSource()!.source().toString();
    let match = source.match(/__webpack_public_path__\s*\+\s*"(.*?)"/);
    if (match) {
        return publicPath + match[1];
    }
    match = source.match(/module.exports\s*=\s*"(.*?)"/);
    if (match) {
        return match[1];
    }
    match = source.match(/export\s+default\s+"(.*?)"/);
    if (match) {
        return match[1];
    }
    throw new Error(`unknown asset module format ${source}\ntransformed from ${module.resource}`);
}

export function extractDataUrlFromAssetModuleSource(source: string): string {
    let match = source.match(/.exports\s*=\s*"(.*?)"/);
    if (match) {
        return match[1];
    }
    match = source.toString().match(/export\s+default\s+"(.*?)"/);
    if (match) {
        return match[1];
    }
    throw new Error('unknown data url asset module format ' + source);
}

type AssetNormalModule = NormalModule & { loaders: [{ loader: 'file-loader' | 'url-loader' }] };

export function isLoadedWithKnownAssetLoader(module: Module): module is AssetNormalModule {
    if ('loaders' in module) {
        return (module as import('webpack').NormalModule).loaders.some(({ loader }) =>
            /[\\/](file-loader)|(url-loader)[\\/]/.test(loader)
        );
    }
    return false;
}

export function outputOptionsAwareHashContent(
    createHash: WebpackCreateHash,
    outputOptions: WebpackOutputOptions,
    content: string
) {
    const hash = createHash(outputOptions.hashFunction || 'md4');
    if (outputOptions.hashSalt) {
        hash.update(outputOptions.hashSalt);
    }

    hash.update(content);
    const fullHash = /** @type {string} */ hash.digest(outputOptions.hashDigest);
    const contentHash = fullHash.slice(0, outputOptions.hashDigestLength);
    return contentHash.toString();
}

export const LOADER_NAME = 'stylable-plugin-loader';

export function injectLoader(compiler: Compiler) {
    const options = compiler.options;
    if (!options.module.rules) {
        compiler.options.module.rules = [];
    }
    const loaderPath = require.resolve('./loader');
    options.module.rules.unshift({
        test: /\.st\.css$/,
        loader: LOADER_NAME,
        sideEffects: true,
    });
    options.resolve ||= {};
    options.resolve.plugins ||= [];

    // dual mode support
    options.resolve.plugins.push(new ReExt(/\.st\.css\.(c|m)?js$/, '.st.css'));

    options.resolveLoader ??= {};
    options.resolveLoader.alias ??= {};
    if (Array.isArray(options.resolveLoader.alias)) {
        options.resolveLoader.alias.unshift({
            name: LOADER_NAME,
            alias: loaderPath,
        });
    } else {
        options.resolveLoader.alias[LOADER_NAME] = loaderPath;
    }
}

export function createDecacheRequire(compiler: Compiler) {
    const cacheIds = new Set<string>();
    compiler.hooks.done.tap('decache require', () => {
        if (!compiler.watchMode) {
            return;
        }

        for (const id of cacheIds) {
            decache(id);
        }
        cacheIds.clear();
    });
    return (id: string) => {
        if (compiler.watchMode) {
            cacheIds.add(id);
        }

        return require(id);
    };
}

export function createStylableResolverCacheMap(compiler: Compiler): StylableResolverCache {
    const cache: StylableResolverCache = new Map();
    compiler.hooks.done.tap('StylableResolverCache cleanup', () => {
        cache.clear();
    });
    return cache;
}

export function staticCSSWith(
    staticPublicPath: string,
    assetsModules: Map<string, NormalModule>,
    chunkGraph: ChunkGraph,
    moduleGraph: ModuleGraph,
    runtime: string,
    runtimeTemplate: RuntimeTemplate,
    dependencyTemplates: DependencyTemplates
) {
    return (stylableModules: Map<Module, BuildData | null>) =>
        createStaticCSS(
            staticPublicPath,
            stylableModules,
            assetsModules,
            chunkGraph,
            moduleGraph,
            runtime,
            runtimeTemplate,
            dependencyTemplates
        );
}

export function createStaticCSS(
    staticPublicPath: string,
    stylableModules: Map<Module, BuildData | null>,
    assetsModules: Map<string, NormalModule>,
    chunkGraph: ChunkGraph,
    moduleGraph: ModuleGraph,
    runtime: string,
    runtimeTemplate: RuntimeTemplate,
    dependencyTemplates: DependencyTemplates
) {
    const cssChunks = Array.from(stylableModules.keys())
        .filter((m) => getStylableBuildMeta(m).isUsed !== false)
        .sort((m1, m2) => getStylableBuildMeta(m1).depth - getStylableBuildMeta(m2).depth)
        .map((m) => {
            return replaceMappedCSSAssetPlaceholders({
                assetsModules,
                staticPublicPath,
                chunkGraph,
                moduleGraph,
                dependencyTemplates,
                runtime,
                runtimeTemplate,
                stylableBuildData: getStylableBuildData(stylableModules, m),
            });
        });

    return cssChunks;
}

export function getWebpackBuildMeta(module: Module): NonNullable<Module['buildMeta']> {
    const buildMeta = module.buildMeta;
    if (!buildMeta) {
        throw new Error(`Stylable module ${module.identifier()} does not contains build meta`);
    }
    return buildMeta;
}

export function getStylableBuildMeta(module: Module): StylableBuildMeta {
    const meta = module.buildMeta?.stylable;
    if (!meta) {
        throw new Error(`Stylable module ${module.identifier()} does not contains build meta`);
    }
    return meta;
}

export function getStylableBuildData(
    stylableModules: Map<Module, BuildData | null>,
    module: Module
): BuildData {
    const data = stylableModules.get(module);
    if (!data) {
        throw new Error(`Stylable module ${module.identifier()} does not contains build data`);
    }
    return data;
}

export function findIfStylableModuleUsed(
    m: Module,
    compilation: Compilation,
    UnusedDependency: typeof dependencies.HarmonyImportDependency
) {
    const moduleGraph = compilation.moduleGraph;
    const chunkGraph = compilation.chunkGraph;
    const inConnections = uniqueFilterMap(
        moduleGraph.getIncomingConnections(m),
        ({ resolvedOriginModule, dependency }) =>
            dependency instanceof UnusedDependency ? undefined : resolvedOriginModule
    );

    // TODO: check if we can optimize by checking if a module contained in at least one chunk.

    let isInUse = false;
    for (const connectionModule of inConnections) {
        if (connectionModule.buildMeta?.sideEffectFree) {
            const info = moduleGraph.getExportsInfo(connectionModule);
            const usedExports = (
                info.getUsedExports as any
            )(/*if passed undefined it finds usages in all chunks*/);
            if (usedExports === false) {
                continue;
            } else if (usedExports === true || usedExports === null) {
                /** noop */
            } else if (usedExports.size === 0) {
                continue;
            }
        }
        const chunksCount = chunkGraph.getNumberOfModuleChunks(connectionModule);

        if (chunksCount > 0) {
            isInUse = true;
            break;
        }
    }
    return isInUse;
}

export function getFileName(filename: string, data: Record<string, string | undefined>) {
    return filename.replace(/\[(.*?)]/g, (fullMatch, inner) => {
        const [type, len] = inner.split(':');
        const value = data[type];
        if (value) {
            const length = Number(len);
            return !isNaN(length) ? value.slice(0, length) : value;
        } else {
            return fullMatch;
        }
    });
}

/**
 * sorts by depth, falling back to alpha numeric
 */
export function getSortedModules(stylableModules: Map<NormalModule, BuildData | null>) {
    return Array.from(stylableModules.keys()).sort((m1, m2) => {
        const depthDiff = getStylableBuildMeta(m2).depth - getStylableBuildMeta(m1).depth;
        if (depthDiff === 0) {
            if (m1.resource > m2.resource) {
                return 1;
            } else if (m1.resource < m2.resource) {
                return -1;
            } else {
                return 0;
            }
        } else {
            return depthDiff;
        }
    });
}

export function reportNamespaceCollision(
    namespaceToFileMapping: Map<string, Set<NormalModule>>,
    compilation: Compilation,
    mode: 'ignore' | 'warnings' | 'errors'
) {
    if (mode === 'ignore') {
        return;
    }
    for (const [namespace, resources] of namespaceToFileMapping) {
        if (resources.size > 1) {
            const resourcesReport = [...resources]
                .map((module) => getModuleRequestPath(module, compilation))
                .join('\n');

            const error = new compilation.compiler.webpack.WebpackError(
                `Duplicate namespace ${JSON.stringify(
                    namespace
                )} found in multiple different resources:\n${resourcesReport}\nThis issue indicates multiple versions of the same library in the compilation, or different paths importing the same stylesheet like: "esm" or "cjs".`
            );
            error.hideStack = true;
            compilation[mode].push(error);
        }
    }
}

export function normalizeNamespaceCollisionOption(opt?: boolean | 'warn') {
    if (opt === true) {
        return 'ignore';
    } else if (opt === 'warn') {
        return 'warnings';
    } else {
        return 'errors';
    }
}

function getModuleRequestPath(
    module: NormalModule,
    { requestShortener, moduleGraph }: Compilation
) {
    const visited = new Set<Module>();
    const path = [];
    let current: Module | null = module;
    while (current) {
        if (visited.has(current)) {
            path.unshift(current.readableIdentifier(requestShortener) + '<-- Circular');
            break;
        }
        visited.add(current);
        const currentId = current.readableIdentifier(requestShortener);
        path.unshift(currentId);
        current = moduleGraph.getIssuer(current);
    }
    return path.map((p, i) => '  '.repeat(i) + p).join('\n') + ' <-- Duplicate';
}

export interface OptimizationMapping {
    usageMapping: Record<string, boolean>;
    namespaceMapping: Record<string, string>;
    potentialNamespaceCollision: Map<string, Set<NormalModule>>;
}

export function createOptimizationMapping(
    sortedModules: NormalModule[],
    optimizer: IStylableOptimizer
): OptimizationMapping {
    return sortedModules.reduce<OptimizationMapping>(
        (acc, module) => {
            const { namespace, isUsed } = getStylableBuildMeta(module);

            if (!acc.usageMapping[namespace]) {
                acc.usageMapping[namespace] = isUsed ?? true;
            }
            acc.namespaceMapping[namespace] = optimizer.getNamespace(namespace);
            if (!isUsed) {
                // skip collision map for unused stylesheets
                return acc;
            }
            if (acc.potentialNamespaceCollision.has(namespace)) {
                acc.potentialNamespaceCollision.get(namespace)!.add(module);
            } else {
                acc.potentialNamespaceCollision.set(namespace, new Set([module]));
            }
            return acc;
        },
        {
            usageMapping: {},
            namespaceMapping: {},
            potentialNamespaceCollision: new Map<string, Set<NormalModule>>(),
        }
    );
}

export function getTopLevelInputFilesystem(compiler: Compiler) {
    let fileSystem = compiler.inputFileSystem as any;
    while (fileSystem.fileSystem) {
        fileSystem = fileSystem.fileSystem;
    }
    return fileSystem;
}

export function createCalcDepthContext(moduleGraph: ModuleGraph): CalcDepthContext<Module> {
    return {
        getDependencies: (module) =>
            uniqueFilterMap(moduleGraph.getOutgoingConnections(module), ({ module }) => module),
        getImporters: (module) =>
            uniqueFilterMap(
                moduleGraph.getIncomingConnections(module),
                ({ originModule }) => originModule
            ),
        getModulePathNoExt: (module) => {
            if (isStylableModule(module)) {
                return module.resource.replace(/\.st\.css$/, '');
            }
            const { dir, name } = parse((module as NormalModule)?.resource || '');
            return join(dir, name);
        },
        isStylableModule: (module) => isStylableModule(module),
    };
}

export function getCSSViewModuleWebpack(moduleGraph: ModuleGraph) {
    const context = createCalcDepthContext(moduleGraph);
    return (module: Module) => getCSSViewModule(module, context) as NormalModule | undefined;
}
/**
 * Provide a simple way to share build meta with other plugins without using module state like WeakMap<Compilation, DATA>
 */
export function provideStylableModules(
    compilation: Compilation,
    stylableModules: Map<NormalModule, BuildData | null>
) {
    (compilation as any)[Symbol.for('stylableModules')] = stylableModules;
}

export function getStylableModules(
    compilation: Compilation
): Map<NormalModule, BuildData | null> | undefined {
    return (compilation as any)[Symbol.for('stylableModules')];
}

export function getOnlyChunk(compilation: Compilation) {
    return compilation.entrypoints.size === 1
        ? Array.from(compilation.entrypoints.values())[0].getEntrypointChunk()
        : undefined;
}

export function emitCSSFile(
    compilation: Compilation,
    cssSource: string,
    filenameTemplate: string,
    createHash: WebpackCreateHash,
    chunk?: Chunk
) {
    const contentHash = outputOptionsAwareHashContent(
        createHash,
        compilation.runtimeTemplate.outputOptions,
        cssSource
    );

    const filename = getFileName(filenameTemplate, {
        contenthash: contentHash,
        hash: compilation.hash,
        name: chunk?.name,
    });

    compilation.emitAsset(
        filename,
        new compilation.compiler.webpack.sources.RawSource(cssSource, false)
    );

    return filename;
}

export function getEntryPointModules(
    entryPoint: EntryPoint,
    chunkGraph: ChunkGraph,
    onModule: (module: Module) => void
) {
    for (const chunk of entryPoint.getEntrypointChunk().getAllReferencedChunks()) {
        for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
            onModule(module);
        }
    }
}

export function isDependencyOf(entryPoint: EntryPoint, entrypoints: Iterable<EntryPoint>) {
    // entryPoint.options.dependsOn is not in webpack types;
    for (const parent of entryPoint.getParents()) {
        for (const entry of entrypoints) {
            if (parent.id === entry.id) {
                return true;
            }
        }
    }
    return false;
}
