import fs from '@file-services/node';
import { relative, join, isAbsolute, dirname } from 'path';
import type { Plugin, PluginBuild } from 'esbuild';
import {
    Stylable,
    StylableConfig,
    StylableResults,
    generateStylableJSModuleSource,
} from '@stylable/core';
import { StylableOptimizer } from '@stylable/optimizer';
import { resolveNamespace as resolveNamespaceNode } from '@stylable/node';
import { collectImportsWithSideEffects } from '@stylable/build-tools';
import { resolveConfig, buildDTS } from '@stylable/cli';
import type { DiagnosticsMode } from '@stylable/core/dist/index-internal';
import { buildCache } from './build-cache';
import { wrapDebug } from './debug';
import {
    applyDefaultOptions,
    debounce,
    clearCaches,
    enableEsbuildMetafile,
    createDecacheRequire,
    namespaces,
    esbuildEmitDiagnostics,
    importsCollector,
    processAssetsAndApplyStubs,
    processAssetsStubs,
    wrapWithDepthMarkers,
    lazyDebugPrint,
    OptimizationMapping,
    buildUsageMapping,
    sortMarkersByDepth,
    IdForPath,
} from './plugin-utils';

export interface ESBuildOptions {
    /**
     * Determine the way css is injected to the document
     * js - every js module contains the css and inject it independently
     * css - emit bundled css asset to injected via link
     */
    cssInjection?: 'js' | 'css';
    /**
     * Config how error and warning reported to esbuild by stylable
     * auto - Stylable warning will emit esbuild warning and Stylable error will emit esbuild error
     * strict - Stylable error and warning will emit esbuild error
     * loose - Stylable error and warning will emit esbuild warning
     */
    diagnosticsMode?: DiagnosticsMode;
    /**
     * A function to override Stylable instance default configuration options
     */
    stylableConfig?: (config: StylableConfig, build: PluginBuild) => StylableConfig;
    /**
     * Use to load stylable config file.
     * true - automatically detect the closest "stylable.config.js" file and use it.
     * false - will not load any "stylable.config.js" file.
     * string - will use the provided string as the "configFile" file path.
     */
    configFile?: boolean | string;
    /**
     *  Use to enable automatic generation of typescript type definitions
     */
    devTypes?: {
        srcDir?: string; // 'src'
        outDir?: string; // 'st-types'
        dtsSourceMap?: boolean; // true
        enabled?: boolean;
    };
    /**
     * Stylable build mode
     */
    mode?: 'production' | 'development';
    /**
     * Determine the runtime stylesheet id kind used by the cssInjection js mode
     * This sets the value of the st_id attribute on the stylesheet element
     * default for dev - 'module+namespace'
     * default for prod - 'namespace'
     */
    runtimeStylesheetId?: 'module' | 'namespace' | 'module+namespace';
    /**
     * Optimization options
     */
    optimize?: {
        removeUnusedComponents?: boolean;
    };
}

export const stylablePlugin = (initialPluginOptions: ESBuildOptions = {}): Plugin => ({
    name: 'esbuild-stylable-plugin',
    setup(build: PluginBuild) {
        const {
            cssInjection,
            diagnosticsMode,
            mode,
            stylableConfig,
            configFile,
            runtimeStylesheetId,
            optimize,
            devTypes,
        } = applyDefaultOptions(initialPluginOptions);
        // we need a cache instance per stylable config.
        const { checkCache, addToCache, transferBuildInfo } = buildCache();

        const lazyClearCaches = debounce(clearCaches, 1000);

        enableEsbuildMetafile(build, cssInjection);

        const requireModule = createDecacheRequire(build);
        const projectRoot = build.initialOptions.absWorkingDir || process.cwd();
        const configFromFile = resolveConfig(
            projectRoot,
            fs,
            typeof configFile === 'string' ? configFile : undefined
        );
        const stConfig = stylableConfig(
            {
                mode,
                projectRoot,
                fileSystem: fs,
                optimizer: new StylableOptimizer(),
                requireModule,
                resolveNamespace:
                    configFromFile?.config?.defaultConfig?.resolveNamespace ?? resolveNamespaceNode,
                resolveModule: configFromFile?.config?.defaultConfig?.resolveModule,
            },
            build
        );
        let onLoadCalled = false;
        const stylable = new Stylable(stConfig);

        const idForPath = new IdForPath();

        /**
         * make all unused imports resolve to a special empty js module
         */
        build.onResolve(
            { filter: /^stylable-unused:/, namespace: namespaces.jsModule },
            wrapDebug('onResolve unused', (args) => {
                return {
                    path: args.path.replace(namespaces.unused + `:`, ''),
                    namespace: namespaces.unused,
                };
            })
        );

        /**
         * handle css/stylable files imported via other stylable files
         */
        build.onResolve(
            { filter: /\.css$/, namespace: namespaces.jsModule },
            wrapDebug('onResolve from stylable js module', (args) => {
                // stylable file generated JavaScript module import self CSS source
                if (args.path === args.importer) {
                    return {
                        path: args.path,
                        pluginData: args.pluginData,
                        namespace: namespaces.css,
                    };
                }
                // dependency import of stylable files js module
                return {
                    path: args.path.replace(namespaces.nativeCss + `:`, ''),
                    namespace: cssInjection === 'css' ? namespaces.nativeCss : namespaces.jsModule,
                    pluginData: args.pluginData,
                };
            })
        );

        /**
         * handle all initial stylable requests from javascript
         */
        build.onResolve(
            { filter: /\.st\.css$/ },
            wrapDebug('onResolve initial requests from js', (args) => {
                return {
                    path: stylable.resolvePath(args.resolveDir, args.path),
                    namespace: namespaces.jsModule,
                };
            })
        );

        /**
         * main loader for stylable files
         * this flow will create the Stylable JS modules
         */
        build.onLoad(
            { filter: /.*/, namespace: namespaces.jsModule },
            wrapDebug('onLoad stylable module', (args) => {
                const cacheResults = checkCache(args.path);
                if (cacheResults) {
                    return cacheResults;
                }
                onLoadCalled = true;

                const res = stylable.transform(args.path);
                const { errors, warnings } = esbuildEmitDiagnostics(res, diagnosticsMode);
                const { imports, collector } = importsCollector(res);
                const { cssDepth = 1, deepDependencies } = res.meta.transformCssDepth!;
                const getModuleId = () => {
                    switch (runtimeStylesheetId) {
                        case 'module':
                            return relative(stylable.projectRoot, args.path);
                        case 'namespace':
                            return res.meta.namespace;
                        case 'module+namespace':
                            return `${relative(stylable.projectRoot, args.path)}|${
                                res.meta.namespace
                            }`;
                        default:
                            throw new Error(`Unknown runtimeStylesheetId: ${runtimeStylesheetId}`);
                    }
                };

                collectImportsWithSideEffects(stylable, res.meta, collector);

                if (cssInjection === 'js') {
                    processAssetsAndApplyStubs(imports, res, stylable);
                }

                if (cssInjection === 'css') {
                    imports.push({
                        from: args.path,
                    });
                }

                const moduleCode = generateStylableJSModuleSource(
                    {
                        imports,
                        namespace: res.meta.namespace,
                        jsExports: res.exports,
                        moduleType: 'esm',
                        runtimeRequest: '@stylable/runtime',
                    },
                    cssInjection === 'js'
                        ? {
                              css: res.meta.targetAst!.toString(),
                              depth: cssDepth,
                              runtimeId: 'esbuild',
                              id: getModuleId(),
                          }
                        : undefined
                );
                return addToCache(args.path, {
                    errors,
                    warnings,
                    watchFiles: [args.path, ...deepDependencies],
                    resolveDir: dirname(args.path),
                    contents: cssInjection === 'js' ? processAssetsStubs(moduleCode) : moduleCode,
                    pluginData: { stylableResults: res },
                });
            })
        );

        /**
         * unused stylable imports results in an empty js module
         */
        build.onLoad(
            { filter: /.*/, namespace: namespaces.unused },
            wrapDebug('onLoad unused module', (args) => {
                return {
                    contents: `/* unused ${JSON.stringify(args.path)} */`,
                };
            })
        );

        /**
         * load css via esbuild native css loader
         * we need to explicit transform here. the pluginData is for the requester module.
         * this is the final step for the css content so no pluginData is passed
         */
        build.onLoad(
            { filter: /.*/, namespace: namespaces.nativeCss },
            wrapDebug('onLoad native css', (args) => {
                const key = namespaces.nativeCss + ':' + args.path;
                const cacheResults = checkCache(key);
                if (cacheResults) {
                    return cacheResults;
                }
                onLoadCalled = true;
                const res = stylable.transform(args.path);
                const { cssDepth, deepDependencies } = res.meta.transformCssDepth!;
                const pathId = idForPath.getId(args.path);
                return addToCache(key, {
                    watchFiles: [args.path, ...deepDependencies],
                    resolveDir: dirname(args.path),
                    contents: wrapWithDepthMarkers(
                        res.meta.targetAst!.toString(),
                        cssDepth,
                        pathId
                    ),
                    loader: 'css',
                });
            })
        );

        /**
         * handle css output of stylable files
         */
        build.onLoad(
            { filter: /.*/, namespace: namespaces.css },
            wrapDebug('onLoad css output', (args) => {
                const { meta } = args.pluginData.stylableResults as StylableResults;
                const { cssDepth = 1 } = meta.transformCssDepth!;
                const pathId = idForPath.getId(args.path);
                return {
                    resolveDir: dirname(args.path),
                    contents: wrapWithDepthMarkers(meta.targetAst!.toString(), cssDepth, pathId),
                    loader: 'css',
                };
            })
        );

        /**
         * process the generated bundle and optimize the css output
         */
        build.onEnd(
            wrapDebug(`onEnd generate cssInjection: ${cssInjection}`, ({ metafile }) => {
                transferBuildInfo();
                if (!onLoadCalled) {
                    lazyDebugPrint();
                    return;
                }
                onLoadCalled = false;
                let mapping: OptimizationMapping;
                if (devTypes.enabled) {
                    if (!metafile) {
                        throw new Error('metafile is required for css injection');
                    }
                    const absSrcDir = join(projectRoot, devTypes.srcDir);
                    const absOutDir = join(projectRoot, devTypes.outDir);

                    mapping ??= buildUsageMapping(metafile, stylable);

                    for (const metaSet of Object.values(mapping.usagesByNamespace!)) {
                        for (const { meta, path } of metaSet) {
                            if (path.startsWith(absSrcDir)) {
                                buildDTS({
                                    res: { meta, exports: meta.exports! },
                                    targetFilePath: join(absOutDir, relative(absSrcDir, path)),
                                    outputLogs: [],
                                    sourceFilePath: undefined,
                                    generated: new Set(),
                                    dtsSourceMap: devTypes.dtsSourceMap,
                                    writeFileSync: fs.writeFileSync,
                                    relative,
                                    dirname,
                                    isAbsolute,
                                    ensureDirectorySync: fs.ensureDirectorySync,
                                });
                            }
                        }
                    }
                }

                if (cssInjection === 'css') {
                    if (!metafile) {
                        throw new Error('metafile is required for css injection');
                    }
                    mapping ??= buildUsageMapping(metafile, stylable);

                    for (const distFile of Object.keys(metafile.outputs)) {
                        if (!distFile.endsWith('.css')) {
                            continue;
                        }
                        const distFilePath = join(stylable.projectRoot, distFile);

                        fs.writeFileSync(
                            distFilePath,
                            sortMarkersByDepth(
                                fs.readFileSync(distFilePath, 'utf8'),
                                stylable,
                                idForPath,
                                optimize.removeUnusedComponents ? mapping : {}
                            )
                        );
                    }
                }
                lazyClearCaches(stylable);
                lazyDebugPrint();
            })
        );
    },
});
