import { Stylable, StylableConfig, packageNamespaceFactory } from '@stylable/core';
import { dirname, relative } from 'path';
import decache from 'decache';
import { Compilation, Compiler, Dependency, NormalModule, util, sources } from 'webpack';
import findConfig from 'find-config';
import {
    injectRuntimeModules,
    StylableRuntimeDependency,
    InjectDependencyTemplate,
} from './runtime-inject';
import { DependencyClass, LoaderData, NormalModuleFactory, StylableBuildMeta } from './types';
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
} from './plugin-utils';
import { calcDepth } from './calc-depth';
import { injectCSSOptimizationRules, injectCssModules } from './mini-css-support';
import { CSSURLDependency, CSSURLDependencyTemplate } from './css-url';
import { loadLocalStylableConfig } from './load-local-stylable-config';

export interface Options {
    filename?: string;
    cssInjection?: 'js' | 'css' | 'mini-css';
    assetsMode?: 'url' | 'loader';
    runtimeStylesheetId?: 'module' | 'namespace';
    diagnosticsMode?: 'auto' | 'strict' | 'loose';
    stylableConfig?: (config: StylableConfig, compiler: Compiler) => StylableConfig;
}

const defaultOptions = (userOptions: Options, isProd: boolean): Required<Options> => ({
    filename: userOptions.filename ?? 'stylable.css',
    cssInjection: userOptions.cssInjection ?? (isProd ? 'css' : 'js'),
    assetsMode: userOptions.assetsMode ?? 'url',
    stylableConfig: userOptions.stylableConfig ?? ((config: StylableConfig) => config),
    runtimeStylesheetId: userOptions.runtimeStylesheetId ?? (isProd ? 'namespace' : 'module'),
    diagnosticsMode: userOptions.diagnosticsMode ?? 'auto',
});

export class StylableWebpackPlugin {
    stylable!: Stylable;
    options!: Required<Options>;
    constructor(private userOptions: Options = {}) {}
    apply(compiler: Compiler) {
        injectLoader(compiler);
        injectCSSOptimizationRules(compiler);

        compiler.hooks.thisCompilation.tap(
            StylableWebpackPlugin.name,
            (compilation, { normalModuleFactory }) => {
                const staticPublicPath = getStaticPublicPath(compilation);
                const assetsModules = new Map<string, NormalModule>();
                const stylableModules = new Set<NormalModule>();

                this.processOptions(compiler);

                this.createStylable(compiler);

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

        const config = loadLocalStylableConfig(compiler.context);
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
                            cssDepth: 0,
                            cssInjection: this.options.cssInjection,
                            isUsed: undefined,
                            ...loaderData,
                        };
                        module.buildMeta.stylable = stylableBuildMeta;
                        module.addDependency(new StylableRuntimeDependency(stylableBuildMeta));
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

        compilation.hooks.optimizeDependencies.tap(StylableWebpackPlugin.name, () => {
            for (const module of stylableModules) {
                const connections = moduleGraph.getOutgoingConnections(module);
                for (const connection of connections) {
                    if (stylableModules.has(connection.module as NormalModule)) {
                        connection.setActive(false);
                    } else if (
                        !isAssetModule(connection.module) &&
                        isLoadedWithKnownAssetLoader(connection.module)
                    ) {
                        connection.setActive(false);
                    }
                }
            }
        });

        compilation.hooks.afterChunks.tap({ name: StylableWebpackPlugin.name, stage: 0 }, () => {
            for (const module of stylableModules) {
                module.buildMeta.stylable.isUsed = findIfStylableModuleUsed(module, compilation);
                module.buildMeta.stylable.cssDepth = calcDepth(module, moduleGraph).depth;
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
                this.options.runtimeStylesheetId
            )
        );
        dependencyFactories.set(CSSURLDependency as DependencyClass, normalModuleFactory);
        dependencyTemplates.set(CSSURLDependency as any, new CSSURLDependencyTemplate());
    }
}
