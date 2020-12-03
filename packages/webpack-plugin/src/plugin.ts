import { Stylable, StylableConfig, packageNamespaceFactory, OptimizeConfig } from '@stylable/core';
import { StylableOptimizer } from '@stylable/optimizer';
import { dirname, relative } from 'path';
import decache from 'decache';
import { Compilation, Compiler, Dependency, NormalModule, util, sources } from 'webpack';

import findConfig from 'find-config';
import {
    injectRuntimeModules,
    StylableRuntimeDependency,
    InjectDependencyTemplate,
} from './runtime-inject';
import {
    getStaticPublicPath,
    isStylableModule,
    isAssetModule,
    isLoadedWithKnownAssetLoader,
    outputOptionsAwareHashContent,
    injectLoader,
    findIfStylableModuleUsed,
    createStaticCSS,
    getFileName,
    getStylableBuildMeta,
    getSortedModules,
    reportNamespaceCollision,
} from './plugin-utils';
import { calcDepth } from './calc-depth';
import { injectCssModules } from './mini-css-support';
import { CSSURLDependency, CSSURLDependencyTemplate } from './css-url';
import { loadStylableConfig } from './load-stylable-config';
import { UnusedDependency, UnusedDependencyTemplate } from './unused-dependency';
import type { DependencyClass, LoaderData, NormalModuleFactory, StylableBuildMeta } from './types';
import { parse } from 'postcss';

type OptimizeOptions = OptimizeConfig & {
    minify?: boolean;
};

export interface Options {
    filename?: string;
    cssInjection?: 'js' | 'css' | 'mini-css' | 'none';
    assetsMode?: 'url' | 'loader';
    runtimeStylesheetId?: 'module' | 'namespace';
    diagnosticsMode?: 'auto' | 'strict' | 'loose';
    runtimeId?: string;
    optimize?: OptimizeOptions;
    optimizer?: StylableOptimizer;
    stylableConfig?: (config: StylableConfig, compiler: Compiler) => StylableConfig;
    unsafeMuteDiagnostics?: {
        DUPLICATE_MODULE_NAMESPACE?: boolean;
    };
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

const defaultOptions = (userOptions: Options, isProd: boolean): Required<Options> => ({
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
});

export class StylableWebpackPlugin {
    stylable!: Stylable;
    options!: Required<Options>;
    constructor(private userOptions: Options = {}, private injectConfigHooks = true) {}
    apply(compiler: Compiler) {
        if (this.injectConfigHooks) {
            injectLoader(compiler);
        }

        compiler.hooks.afterPlugins.tap(StylableWebpackPlugin.name, () => {
            this.processOptions(compiler);
            this.createStylable(compiler);
        });

        compiler.hooks.compilation.tap(
            StylableWebpackPlugin.name,
            (compilation, { normalModuleFactory }) => {
                const staticPublicPath = getStaticPublicPath(compilation);
                const assetsModules = new Map<string, NormalModule>();
                const stylableModules = new Set<NormalModule>();

                this.modulesIntegration(compilation, stylableModules, assetsModules);

                this.chunksIntegration(
                    compilation,
                    staticPublicPath,
                    stylableModules,
                    assetsModules
                );

                this.setupDependencies(
                    compilation,
                    normalModuleFactory,
                    staticPublicPath,
                    assetsModules
                );

                injectRuntimeModules(StylableWebpackPlugin.name, compilation);
            }
        );
    }
    private processOptions(compiler: Compiler) {
        let options = defaultOptions(this.userOptions, compiler.options.mode === 'production');

        const config = loadStylableConfig(compiler.context);
        if (config && config.webpackPlugin) {
            options = config.webpackPlugin(options, compiler);
        }
        this.options = options;
    }
    private createStylable(compiler: Compiler) {
        if (this.stylable) {
            return;
        }
        let fileSystem = compiler.inputFileSystem as any;
        while (fileSystem.fileSystem) {
            fileSystem = fileSystem.fileSystem;
        }
        this.stylable = Stylable.create(
            this.options.stylableConfig(
                {
                    projectRoot: compiler.context,
                    fileSystem,
                    mode: compiler.options.mode === 'production' ? 'production' : 'development',
                    resolveOptions: compiler.options.resolve as any,
                    timedCacheOptions: { useTimer: true, timeout: 1000 },
                    resolveNamespace: packageNamespaceFactory(
                        findConfig,
                        require,
                        { dirname, relative },
                        compiler.options.output.hashSalt || '',
                        ''
                    ),
                    requireModule: (id: string) => {
                        decache(id);
                        return require(id);
                    },
                    optimizer: this.options.optimizer,
                },
                compiler
            )
        );
    }
    private modulesIntegration(
        compilation: Compilation,
        stylableModules: Set<NormalModule>,
        assetsModules: Map<string, NormalModule>
    ) {
        const { moduleGraph } = compilation;

        NormalModule.getCompilationHooks(compilation).loader.tap(
            StylableWebpackPlugin.name,
            (loaderContext, module) => {
                if (isStylableModule(module)) {
                    loaderContext.stylable = this.stylable;
                    loaderContext.assetsMode = this.options.assetsMode;
                    loaderContext.diagnosticsMode = this.options.diagnosticsMode;
                    loaderContext.flagStylableModule = (loaderData: LoaderData) => {
                        stylableModules.add(module);
                        const stylableBuildMeta: StylableBuildMeta = {
                            depth: 0,
                            cssInjection: this.options.cssInjection,
                            isUsed: undefined,
                            ...loaderData,
                        };
                        module.buildMeta.stylable = stylableBuildMeta;
                        module.addDependency(new StylableRuntimeDependency(stylableBuildMeta));

                        for (const request of stylableBuildMeta.unusedImports) {
                            module.addDependency(new UnusedDependency(request) as Dependency);
                        }

                        if (this.options.assetsMode === 'url') {
                            for (const resourcePath of stylableBuildMeta.urls) {
                                module.addDependency(
                                    new CSSURLDependency(resourcePath) as Dependency
                                );
                            }
                        }
                    };
                }
                if (isAssetModule(module)) {
                    assetsModules.set(module.resource, module);
                }
                if (isLoadedWithKnownAssetLoader(module) && !assetsModules.has(module.resource)) {
                    assetsModules.set(module.resource, module);
                }
            }
        );

        if (this.options.assetsMode === 'loader') {
            compilation.hooks.optimizeDependencies.tap(StylableWebpackPlugin.name, () => {
                for (const module of stylableModules) {
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

        compilation.hooks.afterChunks.tap({ name: StylableWebpackPlugin.name, stage: 0 }, () => {
            for (const module of stylableModules) {
                module.buildMeta.stylable.isUsed = findIfStylableModuleUsed(module, compilation);
                module.buildMeta.stylable.depth = calcDepth(module, moduleGraph);
            }
        });

        compilation.hooks.afterChunks.tap(StylableWebpackPlugin.name, () => {
            const optimizer = this.stylable.optimizer!;
            const optimizeOptions = this.options.optimize;
            const sortedModules = getSortedModules(stylableModules);
            const namespaceToFileMapping = new Map<string, Set<string>>();
            const { usageMapping, namespaceMapping } = sortedModules.reduce<{
                usageMapping: Record<string, boolean>;
                namespaceMapping: Record<string, string>;
            }>(
                (acc, module) => {
                    const { namespace, isUsed } = getStylableBuildMeta(module);
                    acc.usageMapping[namespace] = isUsed ?? true;
                    acc.namespaceMapping[namespace] = optimizer.getNamespace(namespace);
                    if (namespaceToFileMapping.has(namespace)) {
                        namespaceToFileMapping.get(namespace)!.add(module.resource);
                    } else {
                        namespaceToFileMapping.set(namespace, new Set([module.resource]));
                    }
                    return acc;
                },
                { usageMapping: {}, namespaceMapping: {} }
            );

            if (!this.options.unsafeMuteDiagnostics.DUPLICATE_MODULE_NAMESPACE) {
                reportNamespaceCollision(namespaceToFileMapping, compilation.errors);
            }

            for (const module of sortedModules) {
                const buildMeta = getStylableBuildMeta(module);
                const { css, exports, globals } = buildMeta;

                const ast = parse(css);

                optimizer.optimizeAst(
                    optimizeOptions,
                    ast,
                    usageMapping,
                    this.stylable.delimiter,
                    exports,
                    globals
                );

                buildMeta.css = optimizeOptions.minify
                    ? optimizer.minifyCSS(ast.toString())
                    : ast.toString();

                if (optimizeOptions.shortNamespaces) {
                    buildMeta.namespace = namespaceMapping[buildMeta.namespace];
                }
            }
        });
    }
    private chunksIntegration(
        compilation: Compilation,
        staticPublicPath: string,
        stylableModules: Set<NormalModule>,
        assetsModules: Map<string, NormalModule>
    ) {
        const { runtimeTemplate } = compilation;

        if (!compilation.compiler.isChild()) {
            if (this.options.cssInjection === 'css') {
                compilation.hooks.processAssets.tap(
                    {
                        name: StylableWebpackPlugin.name,
                        stage: Compilation.PROCESS_ASSETS_STAGE_DERIVED,
                    },
                    () => {
                        const cssSource = createStaticCSS(
                            staticPublicPath,
                            stylableModules,
                            assetsModules
                        ).join('\n');

                        const contentHash = outputOptionsAwareHashContent(
                            util.createHash,
                            runtimeTemplate.outputOptions,
                            cssSource
                        );

                        const cssBundleFilename = getFileName(this.options.filename, {
                            hash: compilation.hash,
                            contenthash: contentHash,
                        });

                        compilation.entrypoints.forEach((entryPoint) => {
                            entryPoint.getEntrypointChunk().files.add(cssBundleFilename);
                        });

                        compilation.emitAsset(
                            cssBundleFilename,
                            new sources.RawSource(cssSource, false)
                        );
                    }
                );
            } else if (this.options.cssInjection === 'mini-css') {
                injectCssModules(
                    compilation,
                    staticPublicPath,
                    util.createHash,
                    stylableModules,
                    assetsModules
                );
            }
        }
    }
    private setupDependencies(
        compilation: Compilation,
        normalModuleFactory: NormalModuleFactory,
        staticPublicPath: string,
        assetsModules: Map<string, NormalModule>
    ) {
        const { dependencyTemplates, dependencyFactories } = compilation;

        dependencyFactories.set(StylableRuntimeDependency, normalModuleFactory);
        dependencyTemplates.set(
            StylableRuntimeDependency,
            new InjectDependencyTemplate(
                staticPublicPath,
                assetsModules,
                this.options.runtimeStylesheetId,
                this.options.runtimeId
            )
        );
        dependencyFactories.set(CSSURLDependency as DependencyClass, normalModuleFactory);
        dependencyTemplates.set(CSSURLDependency as any, new CSSURLDependencyTemplate());

        dependencyFactories.set(UnusedDependency as DependencyClass, normalModuleFactory);
        dependencyTemplates.set(UnusedDependency as any, new UnusedDependencyTemplate());
    }
}
