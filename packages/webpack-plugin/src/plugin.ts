import {
    Stylable,
    StylableConfig,
    packageNamespaceFactory,
    OptimizeConfig,
    DiagnosticsMode,
    IStylableOptimizer,
} from '@stylable/core';
import { sortModulesByDepth, loadStylableConfig, calcDepth } from '@stylable/build-tools';
import { StylableOptimizer } from '@stylable/optimizer';
import cloneDeep from 'lodash.clonedeep';
import { dirname, relative } from 'path';
import type { Compilation, Compiler, NormalModule, WebpackError } from 'webpack';

import findConfig from 'find-config';

import {
    getStaticPublicPath,
    isStylableModule,
    isAssetModule,
    isLoadedWithKnownAssetLoader,
    injectLoader,
    findIfStylableModuleUsed,
    staticCSSWith,
    getStylableBuildMeta,
    reportNamespaceCollision,
    createOptimizationMapping,
    getTopLevelInputFilesystem,
    createDecacheRequire,
    createStylableResolverCacheMap,
    createCalcDepthContext,
    provideStylableModules,
    emitCSSFile,
    getEntryPointModules,
    getOnlyChunk,
    getStylableBuildData,
    isDependencyOf,
    normalizeNamespaceCollisionOption,
} from './plugin-utils';
import { injectCssModules } from './mini-css-support';
import type {
    BuildData,
    EntryPoint,
    LoaderData,
    NormalModuleFactory,
    ResolveOptionsWebpackOptions,
    StylableBuildMeta,
    StylableLoaderContext,
} from './types';
import { parse } from 'postcss';
import { getWebpackEntities, StylableWebpackEntities } from './webpack-entities';
import { reportDiagnostic } from '@stylable/core/dist/report-diagnostic';
import { resolveConfig as resolveStcConfig, STCBuilder } from '@stylable/cli';

type OptimizeOptions = OptimizeConfig & {
    minify?: boolean;
};

export interface StylableWebpackPluginOptions {
    /**
     * Filename of the output bundle when emitting css bundle
     * supports
     * - [contenthash] replacer - "stylable.[contenthash].css" - based on file content hash
     * - [name] replacer - "[name].css" - based on entry name - is not supported in "extractMode: 'single'" with multiple entries
     */
    filename?: string;
    /**
     * Determine the way css is injected to the document
     * js - every js module contains the css and inject it independently
     * css - emit bundled css asset to injected via link
     * mini-css - inject css modules via webpack mini-css-extract-plugin (can support dynamic splitting but order is not deterministic)
     * none - will not generate any output css (usually good for ssr bundles)
     */
    cssInjection?: 'js' | 'css' | 'mini-css' | 'none';
    /**
     * Determine the runtime stylesheet id kind used by the cssInjection js mode
     */
    runtimeStylesheetId?: 'module' | 'namespace';
    /**
     * Config how error and warning reported to webpack by stylable
     * auto - Stylable warning will emit Webpack warning and Stylable error will emit Webpack error
     * strict - Stylable error and warning will emit Webpack error
     * loose - Stylable error and warning will emit Webpack warning
     */
    diagnosticsMode?: DiagnosticsMode;
    /**
     * Target of the js module
     * oldie - ES3 compatible
     * modern - ES2105 compatible
     */
    target?: 'oldie' | 'modern';
    /**
     * Set the <style> tag st_id attribute to allow multiple Stylable build to be separated in the head
     * This only apply to cssInjection js mode
     */
    runtimeId?: string;
    /**
     * Optimization options
     */
    optimize?: OptimizeOptions;
    /**
     * Provide custom StylableOptimizer
     */
    optimizer?: IStylableOptimizer;
    /**
     * A function to override Stylable instance default configuration options
     */
    stylableConfig?: (config: StylableConfig, compiler: Compiler) => StylableConfig;
    /**
     * Allow to disable specific diagnostics reports
     */
    unsafeMuteDiagnostics?: {
        DUPLICATE_MODULE_NAMESPACE?: boolean | 'warn';
    };
    /**
     * Runs "stc" programmatically with the webpack compilation.
     * true - it will automatically detect the closest "stylable.config.js" file and use it.
     * string - it will use the provided string as the "stcConfig" file path.
     */
    stcConfig?: boolean | string;
    /**
     * Set the strategy of how to spit the extracted css
     * This option is only used when cssInjection is set to 'css'
     * single - extract all css to a single file
     * entries - extract file per entry which does not depend on another entry
     */
    extractMode?: 'single' | 'entries';
    /**
     * Allow filter for url asset processing.
     * Filtered asset will not be processed and remain untouched.
     */
    assetFilter?: (url: string, context: string) => boolean;
    /**
     * @deprecated webpack 5 recommendation is to use AssetsModules for loading assets
     */
    assetsMode?: 'url' | 'loader';
}

const defaultOptimizations = (isProd: boolean): Required<OptimizeOptions> => ({
    removeUnusedComponents: true,
    removeStylableDirectives: true,
    removeComments: isProd,
    classNameOptimizations: isProd,
    shortNamespaces: isProd,
    removeEmptyNodes: isProd,
    minify: isProd,
});

const defaultOptions = (
    userOptions: StylableWebpackPluginOptions,
    isProd: boolean
): Required<StylableWebpackPluginOptions> => ({
    filename: userOptions.filename ?? 'stylable.css',
    cssInjection: userOptions.cssInjection ?? (isProd ? 'css' : 'js'),
    assetsMode: userOptions.assetsMode ?? 'url',
    stylableConfig: userOptions.stylableConfig ?? ((config: StylableConfig) => config),
    runtimeStylesheetId: userOptions.runtimeStylesheetId ?? (isProd ? 'namespace' : 'module'),
    diagnosticsMode: userOptions.diagnosticsMode ?? 'auto',
    runtimeId: userOptions.runtimeId ?? '0',
    unsafeMuteDiagnostics: userOptions.unsafeMuteDiagnostics ?? {},
    optimize: userOptions.optimize
        ? { ...defaultOptimizations(isProd), ...userOptions.optimize }
        : defaultOptimizations(isProd),
    optimizer: userOptions.optimizer ?? new StylableOptimizer(),
    target: userOptions.target ?? 'modern',
    assetFilter: userOptions.assetFilter ?? (() => true),
    extractMode: userOptions.extractMode ?? 'single',
    stcConfig: userOptions.stcConfig ?? false,
});

export class StylableWebpackPlugin {
    stylable!: Stylable;
    options!: Required<StylableWebpackPluginOptions>;
    entities!: StylableWebpackEntities;
    stcBuilder: STCBuilder | undefined;

    constructor(
        private userOptions: StylableWebpackPluginOptions = {},
        private injectConfigHooks = true
    ) {}
    apply(compiler: Compiler) {
        /**
         * Create all webpack entities
         */
        this.entities = getWebpackEntities(compiler.webpack);
        /**
         * This plugin is based on a loader so we inject the loader here
         */
        if (this.injectConfigHooks) {
            injectLoader(compiler);
        }

        /**
         * We want to catch any configuration changes made by other plugins
         * only after they run we process our options and create the Stylable instance
         */
        compiler.hooks.afterPlugins.tap(StylableWebpackPlugin.name, () => {
            this.processOptions(compiler);
            this.createStylable(compiler);
            this.createStcBuilder(compiler);
        });

        compiler.hooks.beforeRun.tapPromise(StylableWebpackPlugin.name, async () => {
            await this.stcBuilder?.build();
        });

        compiler.hooks.watchRun.tapPromise(
            { name: StylableWebpackPlugin.name, stage: 0 },
            async () => {
                if (this.stcBuilder?.watchHandler) {
                    await this.stcBuilder.rebuildModifiedFiles([
                        ...(compiler.modifiedFiles ?? []),
                        ...(compiler.removedFiles ?? []),
                    ]);
                } else {
                    await this.stcBuilder?.build();
                }
            }
        );

        compiler.hooks.thisCompilation.tap(StylableWebpackPlugin.name, (compilation) => {
            /**
             * Register STC projects directories as dependencies
             */
            if (this.stcBuilder?.projects) {
                compilation.contextDependencies.addAll(this.stcBuilder.getProjectsSources());
            }
        });

        compiler.hooks.compilation.tap(
            StylableWebpackPlugin.name,
            (compilation, { normalModuleFactory }) => {
                /**
                 * Since we embed assets in the bundle css we must know the public path in advance
                 */
                const staticPublicPath = getStaticPublicPath(compilation);

                const assetsModules = new Map<string, NormalModule>();
                const stylableModules = new Map<NormalModule, BuildData | null>();
                /** allow other plugins to access the stylableModules */
                provideStylableModules(compilation, stylableModules);

                /**
                 * Handle things that related to each module
                 */
                this.modulesIntegration(
                    compiler.webpack,
                    compilation,
                    stylableModules,
                    assetsModules
                );

                /**
                 * Handle things that related to chunking and bundling
                 */
                this.chunksIntegration(
                    compiler.webpack,
                    compilation,
                    staticPublicPath,
                    stylableModules,
                    assetsModules
                );

                /**
                 * Setup all the boilerplate Webpack dependencies and factories
                 */
                this.setupDependencies(
                    compilation,
                    normalModuleFactory,
                    staticPublicPath,
                    stylableModules,
                    assetsModules
                );

                /**
                 * Here we inject our runtime code for the js modules and injection of css to head
                 */
                this.entities.injectRuntimeModules(StylableWebpackPlugin.name, compilation);
            }
        );
    }
    private processOptions(compiler: Compiler) {
        const defaults = defaultOptions(this.userOptions, compiler.options.mode === 'production');

        const options =
            loadStylableConfig(compiler.context, (config) => {
                return isWebpackConfigProcessor(config)
                    ? config.webpackPlugin(defaults, compiler)
                    : undefined;
            })?.config || defaults;

        this.options = options;
    }
    private createStcBuilder(compiler: Compiler) {
        if (!this.options.stcConfig) {
            return;
        }

        const configuration = resolveStcConfig(
            compiler.context,
            typeof this.options.stcConfig === 'string' ? this.options.stcConfig : undefined
        );

        if (!configuration) {
            throw new Error(
                `Could not find "stcConfig"${
                    typeof this.options.stcConfig === 'string'
                        ? ` at "${this.options.stcConfig}"`
                        : ''
                }`
            );
        }

        /**
         * In case the user uses STC we can run his config in this process.
         */
        this.stcBuilder = STCBuilder.create({
            rootDir: compiler.context,
            watchMode: compiler.watchMode,
            configFilePath: configuration.path,
        });
    }
    private createStylable(compiler: Compiler) {
        if (this.stylable) {
            return;
        }

        const resolverOptions: ResolveOptionsWebpackOptions = {
            ...compiler.options.resolve,
            aliasFields:
                compiler.options.resolve.byDependency?.esm?.aliasFields ||
                compiler.options.resolve.aliasFields,
        };

        this.stylable = Stylable.create(
            this.options.stylableConfig(
                {
                    projectRoot: compiler.context,
                    /**
                     * We need to get the top level file system
                     * because issue with the sync resolver we create inside Stylable
                     */
                    fileSystem: getTopLevelInputFilesystem(compiler),
                    mode: compiler.options.mode === 'production' ? 'production' : 'development',
                    resolveOptions: {
                        ...resolverOptions,
                        extensions: [], // use Stylable's default extensions
                    },
                    resolveNamespace: packageNamespaceFactory(
                        findConfig,
                        require,
                        { dirname, relative },
                        compiler.options.output.hashSalt || '',
                        ''
                    ),
                    requireModule: compiler.watchMode ? createDecacheRequire(compiler) : require,
                    optimizer: this.options.optimizer,
                    resolverCache: createStylableResolverCacheMap(compiler),
                },
                compiler
            )
        );
    }
    private modulesIntegration(
        webpack: Compiler['webpack'],
        compilation: Compilation,
        stylableModules: Map<NormalModule, BuildData | null>,
        assetsModules: Map<string, NormalModule>
    ) {
        const { moduleGraph } = compilation;

        /**
         * Here we are creating the context that our loader needs
         */
        webpack.NormalModule.getCompilationHooks(compilation).loader.tap(
            StylableWebpackPlugin.name,
            (webpackLoaderContext, module) => {
                const loaderContext = webpackLoaderContext as StylableLoaderContext;
                if (isStylableModule(module)) {
                    loaderContext.stylable = this.stylable;
                    loaderContext.assetsMode = this.options.assetsMode;
                    loaderContext.diagnosticsMode = this.options.diagnosticsMode;
                    loaderContext.target = this.options.target;
                    loaderContext.assetFilter = this.options.assetFilter;
                    /**
                     * Every Stylable file that our loader handles will be call this function to add additional build data
                     */
                    loaderContext.flagStylableModule = (loaderData: LoaderData) => {
                        const stylableBuildMeta: StylableBuildMeta = {
                            depth: 0,
                            isUsed: undefined,
                            ...loaderData,
                        };
                        module.buildMeta.stylable = stylableBuildMeta;

                        /**
                         * We want to add the unused imports because we need them to calculate the depth correctly
                         * They might be used by other stylesheets so they might end up in the final build
                         */
                        for (const request of stylableBuildMeta.unusedImports) {
                            module.addDependency(new this.entities.UnusedDependency(request));
                        }

                        /**
                         * Since we don't use the Webpack js api of url assets we have our own CSSURLDependency
                         */
                        if (this.options.assetsMode === 'url') {
                            for (const resourcePath of stylableBuildMeta.urls) {
                                module.addDependency(
                                    new this.entities.CSSURLDependency(resourcePath)
                                );
                            }
                        }
                        /**
                         * This dependency is responsible for injecting the runtime to the main chunk and each module
                         */
                        module.addDependency(
                            new this.entities.StylableRuntimeDependency(stylableBuildMeta)
                        );
                    };

                    loaderContext.onLoaderFinished = () => {
                        /**
                         * If STC Builder is running in background we need to add the relevant files to webpack file dependencies watcher.
                         */
                        this.handleStcFiles(module, compilation, loaderContext);
                    };
                }
            }
        );

        /**
         * We collect the modules that we are going to handle here once.
         */
        compilation.hooks.optimizeDependencies.tap(StylableWebpackPlugin.name, (modules) => {
            for (const module of modules) {
                if (isStylableModule(module) && module.buildMeta.stylable) {
                    stylableModules.set(module, null);
                }
                if (isAssetModule(module)) {
                    assetsModules.set(module.resource, module);
                }
                /**
                 * @remove
                 * This part supports old loaders and should be removed
                 */
                if (isLoadedWithKnownAssetLoader(module) && !assetsModules.has(module.resource)) {
                    assetsModules.set(module.resource, module);
                }
            }
        });

        /**
         * @remove
         * This part supports old loaders and should be removed
         */
        if (this.options.assetsMode === 'loader') {
            compilation.hooks.optimizeDependencies.tap(StylableWebpackPlugin.name, () => {
                for (const [module] of stylableModules) {
                    const connections = moduleGraph.getOutgoingConnections(module);
                    for (const connection of connections) {
                        if (
                            !isAssetModule(connection.module) &&
                            isLoadedWithKnownAssetLoader(connection.module)
                        ) {
                            connection.setActive(false);
                        }
                    }
                }
            });
        }

        /**
         *  After we have the initial chunks we can calculate the depth and usage of each stylesheet and create buildData
         */
        compilation.hooks.afterChunks.tap({ name: StylableWebpackPlugin.name, stage: 0 }, () => {
            const cache = new Map();
            const context = createCalcDepthContext(moduleGraph);
            for (const [module] of stylableModules) {
                module.buildMeta.stylable.isUsed = findIfStylableModuleUsed(
                    module,
                    compilation,
                    this.entities.UnusedDependency
                );
                /** legacy flow */
                module.buildMeta.stylable.depth = calcDepth(module, context, [], cache);

                const { css, urls, exports, namespace } = getStylableBuildMeta(module);
                stylableModules.set(module, {
                    exports: cloneDeep(exports),
                    urls: cloneDeep(urls),
                    namespace,
                    css,
                    isUsed: module.buildMeta.stylable.isUsed,
                    depth: module.buildMeta.stylable.depth,
                });
            }
        });

        compilation.hooks.afterChunks.tap(StylableWebpackPlugin.name, () => {
            const optimizer = this.stylable.optimizer!;
            const optimizeOptions = this.options.optimize;
            const sortedModules = sortModulesByDepth(
                Array.from(stylableModules.keys()),
                (m) => getStylableBuildMeta(m).depth,
                (m) => m.resource
            );

            const { usageMapping, namespaceMapping, namespaceToFileMapping } =
                createOptimizationMapping(sortedModules, optimizer);

            reportNamespaceCollision(
                namespaceToFileMapping,
                compilation,
                normalizeNamespaceCollisionOption(
                    this.options.unsafeMuteDiagnostics.DUPLICATE_MODULE_NAMESPACE
                )
            );

            for (const module of sortedModules) {
                const { css, globals, namespace } = getStylableBuildMeta(module);

                try {
                    const buildData = stylableModules.get(module)!;
                    const ast = parse(css, { from: module.resource });

                    optimizer.optimizeAst(
                        optimizeOptions,
                        ast,
                        usageMapping,
                        this.stylable.delimiter,
                        buildData.exports,
                        globals
                    );

                    buildData.css = optimizeOptions.minify
                        ? optimizer.minifyCSS(ast.toString())
                        : ast.toString();

                    if (optimizeOptions.shortNamespaces) {
                        buildData.namespace = namespaceMapping[namespace];
                    }
                } catch (e) {
                    compilation.errors.push(e as WebpackError);
                }
            }
        });
    }
    private handleStcFiles(
        module: NormalModule,
        compilation: Compilation,
        loaderContext: StylableLoaderContext
    ) {
        if (!this.stcBuilder?.outputFiles) {
            return;
        }

        const sources = this.stcBuilder.outputFiles.get(module.resource);

        if (sources) {
            /**
             * Remove output file diagnostics only if has source files
             */
            module.clearWarningsAndErrors();

            for (const sourceFilePath of sources) {
                /**
                 * Register the source file as a dependency
                 */
                compilation.fileDependencies.add(sourceFilePath);

                const diagnostics = this.stcBuilder.diagnosticsMessages.get(sourceFilePath);

                if (diagnostics) {
                    for (const diagnostic of diagnostics) {
                        /**
                         * Add source file diagnostic to the output file module (more accurate diagnostic)
                         */
                        reportDiagnostic(
                            loaderContext,
                            this.options.diagnosticsMode,
                            diagnostic,
                            `${sourceFilePath}${
                                diagnostic.line && diagnostic.column
                                    ? `:${diagnostic.line}:${diagnostic.column}`
                                    : ''
                            }`
                        );
                    }
                }
            }
        }
    }

    private chunksIntegration(
        webpack: Compiler['webpack'],
        compilation: Compilation,
        staticPublicPath: string,
        stylableModules: Map<NormalModule, BuildData | null>,
        assetsModules: Map<string, NormalModule>
    ) {
        /**
         * As a work around unknown behavior
         * if this plugin will run inside a child compilation we do not emit css assets
         */
        if (!compilation.compiler.isChild()) {
            if (this.options.cssInjection === 'css') {
                const createStaticCSS = staticCSSWith(
                    staticPublicPath,
                    assetsModules,
                    compilation.chunkGraph,
                    compilation.moduleGraph,
                    'CSS' /*runtime*/,
                    compilation.runtimeTemplate,
                    compilation.dependencyTemplates
                );

                if (this.options.extractMode === 'entries') {
                    let modulesPerChunks: Array<{
                        entryPoint: EntryPoint;
                        modules: Map<NormalModule, BuildData | null>;
                    }>;
                    compilation.hooks.afterOptimizeTree.tap(StylableWebpackPlugin.name, () => {
                        modulesPerChunks = [];
                        for (const entryPoint of compilation.entrypoints.values()) {
                            if (isDependencyOf(entryPoint, compilation.entrypoints.values())) {
                                continue;
                            }
                            const modules = new Map<NormalModule, BuildData | null>();
                            getEntryPointModules(entryPoint, compilation.chunkGraph, (module) => {
                                const m = module as NormalModule;
                                if (stylableModules.has(m)) {
                                    modules.set(m, getStylableBuildData(stylableModules, m));
                                }
                            });
                            if (modules.size) {
                                modulesPerChunks.push({ entryPoint, modules });
                            }
                        }
                    });
                    compilation.hooks.processAssets.tap(
                        {
                            name: StylableWebpackPlugin.name,
                            stage: webpack.Compilation.PROCESS_ASSETS_STAGE_DERIVED,
                        },
                        () => {
                            for (const { entryPoint, modules } of modulesPerChunks) {
                                const entryChunk = entryPoint.getEntrypointChunk();
                                entryChunk.files.add(
                                    emitCSSFile(
                                        compilation,
                                        createStaticCSS(modules).join('\n'),
                                        this.options.filename,
                                        webpack.util.createHash,
                                        entryChunk
                                    )
                                );
                            }
                        }
                    );
                } else if (this.options.extractMode === 'single') {
                    compilation.hooks.processAssets.tap(
                        {
                            name: StylableWebpackPlugin.name,
                            stage: webpack.Compilation.PROCESS_ASSETS_STAGE_DERIVED,
                        },
                        () => {
                            if (!stylableModules.size) {
                                return;
                            }
                            const chunk = getOnlyChunk(compilation);
                            const cssSource = createStaticCSS(stylableModules).join('\n');
                            const cssBundleFilename = emitCSSFile(
                                compilation,
                                cssSource,
                                this.options.filename,
                                webpack.util.createHash,
                                chunk
                            );
                            for (const entryPoint of compilation.entrypoints.values()) {
                                entryPoint.getEntrypointChunk().files.add(cssBundleFilename);
                            }
                        }
                    );
                }
            } else if (this.options.cssInjection === 'mini-css') {
                injectCssModules(
                    webpack,
                    compilation,
                    staticPublicPath,
                    stylableModules,
                    assetsModules
                );
            }
        }
    }
    private setupDependencies(
        { dependencyTemplates, dependencyFactories }: Compilation,
        normalModuleFactory: NormalModuleFactory,
        staticPublicPath: string,
        stylableModules: Map<NormalModule, BuildData | null>,
        assetsModules: Map<string, NormalModule>
    ) {
        const {
            StylableRuntimeDependency,
            InjectDependencyTemplate,
            CSSURLDependency,
            NoopTemplate,
            UnusedDependency,
        } = this.entities;

        dependencyFactories.set(StylableRuntimeDependency, normalModuleFactory);
        dependencyTemplates.set(
            StylableRuntimeDependency,
            new InjectDependencyTemplate(
                staticPublicPath,
                stylableModules,
                assetsModules,
                this.options.runtimeStylesheetId,
                this.options.runtimeId,
                this.options.cssInjection
            )
        );
        dependencyFactories.set(CSSURLDependency, normalModuleFactory);
        dependencyTemplates.set(CSSURLDependency, new NoopTemplate());

        dependencyFactories.set(UnusedDependency, normalModuleFactory);
        dependencyTemplates.set(UnusedDependency, new NoopTemplate());
    }
}

function isWebpackConfigProcessor(config: any): config is {
    webpackPlugin: (
        options: Required<StylableWebpackPluginOptions>,
        compiler: Compiler
    ) => Required<StylableWebpackPluginOptions>;
} {
    return typeof config === 'object' && typeof config.webpackPlugin === 'function';
}
