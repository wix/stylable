import { MinimalFS, Stylable, StylableConfig } from '@stylable/core';
import {
    OptimizeConfig,
    DiagnosticsMode,
    IStylableOptimizer,
    validateDefaultConfig,
} from '@stylable/core/dist/index-internal';
import { createNamespaceStrategyNode } from '@stylable/node';
import { sortModulesByDepth, loadStylableConfig, calcDepth } from '@stylable/build-tools';
import { StylableOptimizer } from '@stylable/optimizer';
import cloneDeep from 'lodash.clonedeep';
import type { Compilation, Compiler, Module, NormalModule, WebpackError } from 'webpack';

import {
    getStaticPublicPath,
    isStylableModule,
    isLoadedNativeCSSModule,
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
    getWebpackBuildMeta,
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
     * This sets the value of the st_id attribute on the stylesheet element
     * default for dev - 'module'
     * default for prod - 'namespace'
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
     * Set the <style> tag st_runtime attribute to allow multiple Stylable build to be separated in the head
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
    /**
     * The strategy used to calculate stylesheet override depth
     * 'css+js' - use css and js files to calculate depth
     * 'css' - use only css files to calculate depth
     */
    depthStrategy?: 'css+js' | 'css';
    /**
     * Improved side-effect detection to include stylesheets with deep global side-effects.
     * Defaults to true.
     */
    includeGlobalSideEffects?: boolean;
    /**
     * Experimental flag that attaches CSS bundle asset to every chunk that contains references to stylable stylesheets.
     * The default off mode attaches only to entry chunks.
     */
    experimentalAttachCssToContainingChunks?: boolean;
}

const defaultOptimizations = (isProd: boolean): Required<OptimizeOptions> => ({
    removeUnusedComponents: true,
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
    depthStrategy: userOptions.depthStrategy ?? 'css+js',
    includeGlobalSideEffects: userOptions.includeGlobalSideEffects ?? true,
    experimentalAttachCssToContainingChunks:
        userOptions.experimentalAttachCssToContainingChunks ?? false,
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
            async (compiler) => {
                await this.stcBuilder?.rebuild([
                    ...(compiler.modifiedFiles ?? []),
                    ...(compiler.removedFiles ?? []),
                ]);
            }
        );

        compiler.hooks.thisCompilation.tap(StylableWebpackPlugin.name, (compilation) => {
            /**
             * Register STC projects directories as dependencies
             */
            if (this.stcBuilder) {
                compilation.contextDependencies.addAll(this.stcBuilder.getProjectsSources());
            }
        });

        compiler.hooks.afterDone.tap(StylableWebpackPlugin.name, () => {
            /**
             * If there are diagnostics left, report them.
             */
            if (this.stcBuilder) {
                const logger = compiler.getInfrastructureLogger(StylableWebpackPlugin.name);

                this.stcBuilder.reportDiagnostics(
                    {
                        emitError: (e) => logger.error(e),
                        emitWarning: (w) => logger.warn(w),
                    },
                    this.options.diagnosticsMode,
                    true
                );
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
                    assetsModules,
                    this.options.experimentalAttachCssToContainingChunks
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
                    ? config.webpackPlugin(defaults, compiler, getTopLevelInputFilesystem(compiler))
                    : undefined;
            })?.config || defaults;

        this.options = options;
    }
    private getStylableConfig(compiler: Compiler) {
        const configuration = resolveStcConfig(
            compiler.context,
            typeof this.options.stcConfig === 'string' ? this.options.stcConfig : undefined,
            getTopLevelInputFilesystem(compiler)
        );

        return configuration;
    }
    private createStcBuilder(compiler: Compiler) {
        if (!this.options.stcConfig) {
            return;
        }

        const config = this.getStylableConfig(compiler);

        /**
         * In case the user uses STC we can run his config in this process.
         */
        if (config) {
            this.stcBuilder = STCBuilder.create({
                rootDir: compiler.context,
                watchMode: compiler.watchMode,
                configFilePath: config.path,
            });
        }
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

        const topLevelFs = getTopLevelInputFilesystem(compiler);
        const stylableConfig = this.getStylableConfig(compiler)?.config;

        validateDefaultConfig(stylableConfig?.defaultConfig);

        this.stylable = new Stylable(
            this.options.stylableConfig(
                {
                    projectRoot: compiler.context,
                    /**
                     * We need to get the top level file system
                     * because issue with the sync resolver we create inside Stylable
                     */
                    fileSystem: topLevelFs,
                    mode: compiler.options.mode === 'production' ? 'production' : 'development',
                    resolveOptions: {
                        ...resolverOptions,
                        extensions: [], // use Stylable's default extensions
                    },
                    resolveNamespace: createNamespaceStrategyNode({
                        hashSalt: compiler.options.output.hashSalt || '',
                    }),
                    requireModule: createDecacheRequire(compiler),
                    optimizer: this.options.optimizer,
                    resolverCache: createStylableResolverCacheMap(compiler),
                    /**
                     * config order is user determined
                     * each configuration points receives the default options,
                     * and lets the user mix and match the options as they wish
                     */
                    ...stylableConfig?.defaultConfig,
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
                if (isStylableModule(module) || isLoadedNativeCSSModule(module, moduleGraph)) {
                    loaderContext.stylable = this.stylable;
                    loaderContext.assetsMode = this.options.assetsMode;
                    loaderContext.diagnosticsMode = this.options.diagnosticsMode;
                    loaderContext.target = this.options.target;
                    loaderContext.assetFilter = this.options.assetFilter;
                    loaderContext.includeGlobalSideEffects = this.options.includeGlobalSideEffects;
                    /**
                     * Every Stylable file that our loader handles will be call this function to add additional build data
                     */
                    loaderContext.flagStylableModule = (loaderData: LoaderData) => {
                        const stylableBuildMeta: StylableBuildMeta = {
                            depth: 0,
                            isUsed: undefined,
                            ...loaderData,
                        };
                        getWebpackBuildMeta(module).stylable = stylableBuildMeta;

                        /**
                         * We want to add the unused imports because we need them to calculate the depth correctly
                         * They might be used by other stylesheets so they might end up in the final build
                         */
                        for (const resolvedAbsPath of stylableBuildMeta.unusedImports) {
                            module.addDependency(
                                new this.entities.UnusedDependency(resolvedAbsPath, 0)
                            );
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

                        /**
                         * If STC Builder is running in background we need to add the relevant files to webpack file dependencies watcher,
                         * and emit diagnostics from the sources and not from the output.
                         */
                        if (!this.stcBuilder) {
                            return;
                        }
                        const sources = this.stcBuilder.getSourcesFiles(module.resource);

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

                                /**
                                 * Add source file diagnostics to the output file module (more accurate diagnostic)
                                 */
                                this.stcBuilder.reportDiagnostic(
                                    sourceFilePath,
                                    loaderContext,
                                    this.options.diagnosticsMode,
                                    true
                                );
                            }
                        }
                    };
                }
            }
        );

        /**
         * We collect the modules that we are going to handle here once.
         */
        compilation.hooks.optimizeDependencies.tap(StylableWebpackPlugin.name, (modules) => {
            for (const module of modules) {
                if (
                    (isStylableModule(module) || isLoadedNativeCSSModule(module, moduleGraph)) &&
                    module.buildMeta?.stylable
                ) {
                    stylableModules.set(module, null);
                }
                if (isAssetModule(module)) {
                    assetsModules.set(module.resource, module);
                }
                module.dependencies.forEach((dep) => {
                    if (dep instanceof this.entities.UnusedDependency) {
                        compilation.moduleGraph.getConnection(dep)?.setActive(false);
                    }
                });
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
                const stylableBuildMeta = getStylableBuildMeta(module);

                stylableBuildMeta.isUsed = findIfStylableModuleUsed(
                    module,
                    compilation,
                    this.entities.UnusedDependency
                );
                /** legacy flow */

                stylableBuildMeta.depth =
                    this.options.depthStrategy === 'css'
                        ? stylableBuildMeta.cssDepth
                        : calcDepth(module, context, [], cache);

                const { css, urls, exports, namespace } = getStylableBuildMeta(module);
                stylableModules.set(module, {
                    exports: cloneDeep(exports),
                    urls: cloneDeep(urls),
                    namespace,
                    css,
                    isUsed: stylableBuildMeta.isUsed,
                    depth: stylableBuildMeta.depth,
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

            const { usageMapping, namespaceMapping, potentialNamespaceCollision } =
                createOptimizationMapping(sortedModules, optimizer);

            reportNamespaceCollision(
                potentialNamespaceCollision,
                compilation,
                normalizeNamespaceCollisionOption(
                    this.options.unsafeMuteDiagnostics.DUPLICATE_MODULE_NAMESPACE
                )
            );

            for (const module of sortedModules) {
                const { css, globals, namespace, type } = getStylableBuildMeta(module);

                try {
                    const buildData = stylableModules.get(module)!;
                    let cssOutput = css;
                    if (type === 'stylable') {
                        const ast = parse(css, { from: module.resource });

                        optimizer.optimizeAst(
                            optimizeOptions,
                            ast,
                            usageMapping,
                            buildData.exports,
                            globals
                        );

                        cssOutput = ast.toString();
                    }

                    buildData.css = optimizeOptions.minify
                        ? optimizer.minifyCSS(cssOutput)
                        : cssOutput;

                    if (optimizeOptions.shortNamespaces) {
                        buildData.namespace = namespaceMapping[namespace];
                    }
                } catch (e) {
                    compilation.errors.push(e as WebpackError);
                }
            }
        });
    }

    private chunksIntegration(
        webpack: Compiler['webpack'],
        compilation: Compilation,
        staticPublicPath: string,
        stylableModules: Map<NormalModule, BuildData | null>,
        assetsModules: Map<string, NormalModule>,
        experimentalAttachCssToContainingChunks: boolean
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

                            if (!experimentalAttachCssToContainingChunks) {
                                for (const entryPoint of compilation.entrypoints.values()) {
                                    entryPoint.getEntrypointChunk().files.add(cssBundleFilename);
                                }
                            } else {
                                for (const chunk of compilation.chunks) {
                                    for (const module of chunk.modulesIterable) {
                                        if (
                                            isNormalModule(module) &&
                                            module.resource?.endsWith('.st.css')
                                        ) {
                                            chunk.files.add(cssBundleFilename);
                                            break;
                                        }
                                    }
                                }
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

const isNormalModule = (module: Module): module is NormalModule => {
    return (module as NormalModule).resource !== undefined;
};

function isWebpackConfigProcessor(config: any): config is {
    webpackPlugin: (
        options: Required<StylableWebpackPluginOptions>,
        compiler: Compiler,
        fs: MinimalFS
    ) => Required<StylableWebpackPluginOptions>;
} {
    return typeof config === 'object' && typeof config.webpackPlugin === 'function';
}
