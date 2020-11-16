import { join } from 'path';
import { Compilation, Compiler, Module, NormalModule } from 'webpack';
import { UnusedDependency } from './stcss-dependency';
import { StylableBuildMeta, webpackCreateHash, webpackOutputOptions } from './types';
const { makePathsRelative } = require('webpack/lib/util/identifier');
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

export function isAssetModule(module: Module) {
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
    getAssetOutputPath: (resourcePath: string) => string
) {
    return css.replace(/__stylable_url_asset_(\d+?)__/g, (_match, index) => {
        return `${publicPath + getAssetOutputPath(urls[Number(index)])}`;
    });
}

export function extractFilenameFromAssetModule(m: Module): string {
    const source = m.originalSource().source();
    const match = source.toString().match(/__webpack_public_path__\s*\+\s*"(.*?)"/);
    if (match) {
        return match[1];
    }
    throw new Error('unknown asset module format ' + source);
}

export function getAssetOutputPath(
    createHash: Compiler['webpack']['util']['createHash'],
    module: NormalModule,
    compilation: Compilation,
    runtime?: string,
    staticFilename?: string /* data: */
) {
    const { runtimeTemplate, chunkGraph } = compilation;
    const assetModuleFilename = staticFilename || runtimeTemplate.outputOptions.assetModuleFilename;
    const hash = createHash(runtimeTemplate.outputOptions.hashFunction as string);
    if (runtimeTemplate.outputOptions.hashSalt) {
        hash.update(runtimeTemplate.outputOptions.hashSalt);
    }
    hash.update(module.originalSource().buffer());
    const fullHash = /** @type {string} */ hash.digest(runtimeTemplate.outputOptions.hashDigest);
    const contentHash = fullHash.slice(0, runtimeTemplate.outputOptions.hashDigestLength);
    module.buildInfo.fullContentHash = fullHash;
    const { path: filename } = compilation.getAssetPathWithInfo(assetModuleFilename as any, {
        module,
        runtime,
        filename: makePathsRelative(
            compilation.compiler.context,
            module.matchResource || module.resource,
            compilation.compiler.root
        ).replace(/^\.\//, ''),
        chunkGraph,
        contentHash: contentHash as string,
    });
    return filename;
}

export function isLoadedWithKnownAssetLoader(module: Module) {
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
        loader: join(__dirname, 'loader.ts'),
        sideEffects: true,
    });
}

export function createStaticCSS(
    staticPublicPath: string,
    stylableModules: Set<Module>,
    assetsModules: Map<string, Module>
) {
    const cssChunks = Array.from(stylableModules)
        .filter((m) => m.buildMeta.stylable.isUsed !== false)
        .sort((m1, m2) => m1.buildMeta.stylable.depth - m2.buildMeta.stylable.depth)
        .map((m) =>
            replaceCSSAssetPlaceholders(m.buildMeta.stylable, staticPublicPath, (resourcePath) => {
                const assetModule = assetsModules.get(resourcePath);
                if (!assetModule) {
                    throw new Error('Missing asset module for ' + resourcePath);
                }
                if (isLoadedWithKnownAssetLoader(assetModule)) {
                    return extractFilenameFromAssetModule(assetModule);
                } else {
                    return assetModule.buildInfo.filename;
                }
            })
        );

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
    const { chunkGraph, moduleGraph } = compilation;
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
