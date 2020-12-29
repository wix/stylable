import { join } from 'path';
import { ChunkGraph, Compilation, Compiler, Module, ModuleGraph, NormalModule } from 'webpack';
import { UnusedDependency } from './unused-dependency';
import {
    DependencyTemplates,
    RuntimeTemplate,
    StringSortableSet,
    StylableBuildMeta,
    webpackCreateHash,
    webpackOutputOptions,
} from './types';

export function* uniqueFilterMap<T, O = T>(
    iter: Iterable<T>,
    map = (item: T): O => (item as unknown) as O,
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
    return module.resource?.endsWith('.st.css');
}

export function isAssetModule(module: Module): module is NormalModule {
    return module.type.startsWith('asset/');
}

export function getStaticPublicPath(compilation: Compilation) {
    let publicPath = '';
    if (typeof compilation.outputOptions.publicPath === 'string') {
        publicPath = compilation.outputOptions.publicPath;
        publicPath = publicPath === 'auto' ? '' : publicPath;
        publicPath = publicPath.endsWith('/') ? publicPath : publicPath + '/';
    } else {
        throw new Error('Public path as function is not supported yet.');
    }
    return publicPath;
}

export function replaceCSSAssetPlaceholders(
    { css, urls }: Pick<StylableBuildMeta, 'css' | 'urls'>,
    publicPath: string,
    getAssetOutputPath: (resourcePath: string, publicPath: string) => string
) {
    return css.replace(/__stylable_url_asset_(\d+?)__/g, (_match, index) =>
        getAssetOutputPath(urls[Number(index)], publicPath)
    );
}

interface ReplaceMappedCSSAssetPlaceholdersOptions {
    stylableBuildMeta: StylableBuildMeta;
    staticPublicPath: string;
    assetsModules: Map<string, NormalModule>;
    chunkGraph: ChunkGraph;
    moduleGraph: ModuleGraph;
    runtime?: string | StringSortableSet;
    runtimeTemplate: RuntimeTemplate;
    dependencyTemplates: DependencyTemplates;
}

export function replaceMappedCSSAssetPlaceholders({
    stylableBuildMeta,
    staticPublicPath,
    assetsModules,
    chunkGraph,
    moduleGraph,
    runtime,
    runtimeTemplate,
    dependencyTemplates,
}: ReplaceMappedCSSAssetPlaceholdersOptions) {
    return replaceCSSAssetPlaceholders(
        stylableBuildMeta,
        staticPublicPath,
        (resourcePath, publicPath) => {
            const assetModule = assetsModules.get(resourcePath);
            if (!assetModule) {
                throw new Error('Missing asset module for ' + resourcePath);
            }
            if (isLoadedWithKnownAssetLoader(assetModule)) {
                return extractFilenameFromAssetModule(assetModule, publicPath);
            } else {
                const assetModuleSource = assetModule.generator.generate(assetModule, {
                    chunkGraph,
                    moduleGraph,
                    runtime,
                    runtimeRequirements: new Set(),
                    runtimeTemplate,
                    dependencyTemplates,
                    type: 'asset/resource',
                });

                if (assetModule.buildInfo.dataUrl) {
                    return extractDataUrlFromAssetModuleSource(
                        assetModuleSource.source().toString()
                    );
                }

                return publicPath + assetModule.buildInfo.filename;
            }
        }
    );
}

export function extractFilenameFromAssetModule(m: NormalModule, publicPath: string): string {
    const source = m.originalSource()!.source();
    let match = source.toString().match(/__webpack_public_path__\s*\+\s*"(.*?)"/);
    if (match) {
        return publicPath + match[1];
    }
    match = source.toString().match(/module.exports\s*=\s*"(.*?)"/);
    if (match) {
        return match[1];
    }
    match = source.toString().match(/export\s+default\s+"(.*?)"/);
    if (match) {
        return match[1];
    }
    throw new Error('unknown asset module format ' + source);
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
    if (module instanceof NormalModule) {
        return !!module.loaders.find(({ loader }) =>
            /[\\/](file-loader)|(url-loader)[\\/]/.test(loader)
        );
    }
    return false;
}

export function outputOptionsAwareHashContent(
    createHash: webpackCreateHash,
    outputOptions: webpackOutputOptions,
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

export function injectLoader(compiler: Compiler) {
    if (!compiler.options.module) {
        compiler.options.module = { rules: [] };
    }
    if (!compiler.options.module.rules) {
        compiler.options.module.rules = [];
    }
    compiler.options.module.rules.unshift({
        test: /\.st\.css$/,
        loader: require.resolve(join(__dirname, 'loader')),
        sideEffects: true,
    });
}

export function createStaticCSS(
    staticPublicPath: string,
    stylableModules: Set<Module>,
    assetsModules: Map<string, NormalModule>,

    chunkGraph: ChunkGraph,
    moduleGraph: ModuleGraph,
    runtime: string,
    runtimeTemplate: RuntimeTemplate,
    dependencyTemplates: DependencyTemplates
) {
    const cssChunks = Array.from(stylableModules)
        .filter((m) => m.buildMeta.stylable.isUsed !== false)
        .sort((m1, m2) => m1.buildMeta.stylable.depth - m2.buildMeta.stylable.depth)
        .map((m) => {
            return replaceMappedCSSAssetPlaceholders({
                assetsModules: assetsModules,
                staticPublicPath,
                chunkGraph,
                moduleGraph,
                dependencyTemplates,
                runtime,
                runtimeTemplate,
                stylableBuildMeta: m.buildMeta.stylable,
            });
        });

    return cssChunks;
}

export function getStylableBuildMeta(module: Module): StylableBuildMeta {
    const meta = module.buildMeta.stylable;
    if (!meta) {
        throw new Error('Stylable module does not contains build meta');
    }
    return meta;
}

export function findIfStylableModuleUsed(m: Module, compilation: Compilation) {
    const moduleGraph = compilation.moduleGraph;
    const chunkGraph = compilation.chunkGraph!;
    const inConnections = uniqueFilterMap(
        moduleGraph.getIncomingConnections(m),
        ({ resolvedOriginModule, dependency }) =>
            dependency instanceof UnusedDependency ? undefined : resolvedOriginModule
    );

    // TODO: check if this optimization is good.
    // const inChunks = chunkGraph.getNumberOfModuleChunks(m)
    // if(inChunks === 0) {
    //     debugger
    // }

    let isInUse = false;
    for (const cm of inConnections) {
        if (cm.buildMeta.sideEffectFree) {
            const info = moduleGraph.getExportsInfo(cm);
            const usedExports = (info.getUsedExports as any)(/*if passed undefined it finds usages in all chunks*/);
            if (usedExports === false) {
                continue;
            } else if (usedExports === true || usedExports === null) {
                /** noop */
            } else if (usedExports.size === 0) {
                continue;
            }
        }
        const chunksCount = chunkGraph.getNumberOfModuleChunks(cm);

        if (chunksCount > 0) {
            isInUse = true;
            break;
        }
    }
    return isInUse;
}

export function getFileName(filename: string, data: Record<string, string>) {
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

export function getSortedModules(stylableModules: Set<NormalModule>) {
    return Array.from(stylableModules)
        .sort((m1, m2) => {
            if (m1.resource > m2.resource) {
                return 1;
            } else if (m1.resource < m2.resource) {
                return -1;
            } else {
                return 0;
            }
        })
        .sort((m1, m2) => getStylableBuildMeta(m2).depth - getStylableBuildMeta(m1).depth);
}

export function reportNamespaceCollision(
    namespaceToFileMapping: Map<string, Set<string>>,
    errors: Error[]
) {
    for (const [namespace, resources] of namespaceToFileMapping) {
        if (resources.size > 1) {
            errors.push(
                new Error(
                    `Duplicate namespace ${JSON.stringify(
                        namespace
                    )} found in multiple different resources:\n${Array.from(resources)
                        .map((resource) => {
                            return resource;
                        })
                        .join(
                            '\n'
                        )}\nThis issue indicates multiple versions of the same library in the compilation, or different paths importing the same stylesheet like: "esm" or "cjs".`
                )
            );
        }
    }
}
