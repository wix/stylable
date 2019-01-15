const { EOL } = require('os');
const { RawSource } = require('webpack-sources');
const { Stylable } = require('@stylable/core');
const { resolveNamespace } = require('@stylable/node');
const { StylableOptimizer } = require('@stylable/core/dist/src/optimizer/stylable-optimizer');
const findConfig = require('find-config');
const { connectChunkAndModule } = require('webpack/lib/GraphHelpers');
const { isImportedByNonStylable } = require('./utils');
const { calculateModuleDepthAndShallowStylableDependencies } = require('./stylable-module-helpers');
const { normalizeOptions } = require('./PluginOptions');
const { StylableBootstrapModule } = require('./StylableBootstrapModule');
const { cssRuntimeRendererRequest } = require('./runtime-dependencies');
const StylableParser = require('./StylableParser');
const StylableGenerator = require('./StylableGenerator');
const { getModuleInGraph } = require('./getModuleInGraph');
const { StylableImportDependency, StylableAssetDependency } = require('./StylableDependencies');
const {
    StyleableAutoInitDependency,
    StyleableAutoInitDependencyTemplate
} = require('./StyleableAutoInitDependency');
const MultiModule = require('webpack/lib/MultiModule');

class StylableWebpackPlugin {
    constructor(options = {}) {
        this.userOptions = options;
        this.options = null;
    }
    apply(compiler) {
        this.normalizeOptions(compiler.options.mode);
        this.overrideOptionsWithLocalConfig(compiler.context);
        this.createStylable(compiler);
        this.injectStylableModuleRuleSet(compiler);
        this.injectStylableCompilation(compiler);
        this.injectStylableRuntimeInfo(compiler);
        this.injectStylableRuntimeChunk(compiler);
        this.injectChunkOptimizer(compiler);
        this.injectPlugins(compiler);
    }
    normalizeOptions(mode) {
        this.options = normalizeOptions(this.userOptions, mode);
    }
    overrideOptionsWithLocalConfig(context) {
        let fullOptions = this.options;
        const localConfig = this.loadLocalStylableConfig(context);
        if (localConfig && localConfig.options) {
            fullOptions = localConfig.options(fullOptions);
        }
        this.options = fullOptions;
    }
    loadLocalStylableConfig(dir) {
        let localConfigOverride;
        try {
            localConfigOverride = findConfig.require('stylable.config', { cwd: dir });
        } catch (e) {
            /* no op */
        }
        return localConfigOverride;
    }
    createStylable(compiler) {
        const stylable = new Stylable(
            compiler.context,
            compiler.inputFileSystem,
            this.options.requireModule,
            '--',
            meta => {
                // TODO: move to stylable as param.
                if (this.options.optimize.shortNamespaces) {
                    meta.namespace = stylable.optimizer.namespaceOptimizer.getNamespace(
                        meta,
                        compiler.context,
                        stylable
                    );
                }
                return meta;
            },
            undefined,
            this.options.transformHooks,
            compiler.options.resolve,
            this.options.optimizer || new StylableOptimizer(),
            compiler.options.mode,
            this.options.resolveNamespace || resolveNamespace
        );
        this.stylable = stylable;
    }
    injectPlugins(compiler) {
        this.options.plugins.forEach(plugin => plugin.apply(compiler, this));
    }
    injectStylableRuntimeInfo(compiler) {
        compiler.hooks.compilation.tap(StylableWebpackPlugin.name, compilation => {
            compilation.hooks.optimizeModules.tap(StylableWebpackPlugin.name, modules => {
                const cache = new WeakMap();
                modules.forEach(module => {
                    if (module.type === 'stylable') {
                        module.buildInfo.runtimeInfo = calculateModuleDepthAndShallowStylableDependencies(
                            module,
                            [],
                            [],
                            cache
                        );
                        module.buildInfo.isImportedByNonStylable = isImportedByNonStylable(module);
                    }
                });
            });
        });
        this.injectStylableCSSOptimizer(compiler);
    }
    injectChunkOptimizer(compiler) {
        if (this.options.optimizeStylableModulesPerChunks) {
            compiler.hooks.thisCompilation.tap(StylableWebpackPlugin.name, compilation => {
                compilation.hooks.afterOptimizeChunkIds.tap(StylableWebpackPlugin.name, chunks => {
                    this.optimizeChunks(chunks);
                });
            });
        }
    }
    injectStylableCSSOptimizer(compiler) {
        compiler.hooks.compilation.tap(StylableWebpackPlugin.name, compilation => {
            const used = [];
            const usageMapping = {};
            compilation.hooks.optimizeModules.tap(StylableWebpackPlugin.name, modules => {
                modules.forEach(module => {
                    if (module.type === 'stylable' && module.buildInfo.stylableMeta) {
                        module.buildInfo.optimize = this.options.optimize;
                        module.buildInfo.usageMapping = usageMapping;
                        module.buildInfo.usedStylableModules = used;
                        if (module.buildInfo.isImportedByNonStylable) {
                            used.push(module);
                        }
                        if (
                            !this.options.unsafeMuteDiagnostics.DUPLICATE_MODULE_NAMESPACE &&
                            usageMapping[module.buildInfo.stylableMeta.namespace]
                        ) {
                            compilation.warnings.push(
                                new Error(
                                    `Duplicate module namespace: ${
                                        module.buildInfo.stylableMeta.namespace
                                    } from ${module.resource}`
                                )
                            );
                        }
                        usageMapping[module.buildInfo.stylableMeta.namespace] =
                            module.buildInfo.isImportedByNonStylable;
                    }
                });
            });
        });
    }
    injectStylableRuntimeChunk(compiler) {
        compiler.hooks.thisCompilation.tap(StylableWebpackPlugin.name, (compilation, data) => {
            if (this.options.useEntryModuleInjection) {
                compilation.dependencyTemplates.set(
                    StyleableAutoInitDependency,
                    new StyleableAutoInitDependencyTemplate()
                );
            } else {
                this.injectRuntimeCodeToMainTemplate(compiler, compilation);
            }

            compilation.hooks.optimizeChunks.tap(StylableWebpackPlugin.name, chunks => {
                const runtimeRendererModule = compilation.getModule(cssRuntimeRendererRequest);
                if (!runtimeRendererModule) {
                    return;
                }

                if (this.options.useEntryModuleInjection) {
                    chunks.forEach(chunk => {
                        this.injectInitToEntryModule(chunk, compilation, runtimeRendererModule);
                    });
                }

                this.applyDeprecatedProcess(chunks, compiler, runtimeRendererModule, compilation);
            });

            if (this.options.outputCSS) {
                compilation.hooks.additionalChunkAssets.tap(StylableWebpackPlugin.name, chunks => {
                    chunks.forEach(chunk => {
                        this.createChunkCSSBundle(chunk, compilation);
                    });
                });
            }
        });
    }
    applyDeprecatedProcess(chunks, compiler, runtimeRendererModule, compilation) {
        const chunksBootstraps = chunks.map(chunk =>
            this.createBootstrapModule(compiler, chunk, runtimeRendererModule)
        );
        if (chunksBootstraps.length === 0) {
            return;
        }
        if (this.options.createRuntimeChunk) {
            const extractedStylableChunk = compilation.addChunk('stylable-css-runtime');
            const extractedBootstrap = new StylableBootstrapModule(
                compiler.context,
                extractedStylableChunk,
                runtimeRendererModule,
                this.options.bootstrap
            );
            chunksBootstraps.forEach(bootstrap => {
                bootstrap.chunk.split(extractedStylableChunk);
                bootstrap.dependencies.forEach(dep => {
                    extractedBootstrap.dependencies.push(dep);
                    bootstrap.chunk.moveModule(dep.module, extractedStylableChunk);
                });
            });
            compilation.addModule(extractedBootstrap);
            connectChunkAndModule(extractedStylableChunk, extractedBootstrap);
            extractedStylableChunk.entryModule = extractedBootstrap;
            extractedStylableChunk.stylableBootstrap = extractedBootstrap;
        } else {
            chunksBootstraps.forEach(bootstrap => {
                bootstrap.chunk.stylableBootstrap = bootstrap;
            });
        }
    }
    optimizeChunks(chunks) {
        chunks.forEach(chunk => {
            const stModules = Array.from(chunk.modulesIterable).filter(m => {
                return m.type === 'stylable';
            });

            stModules.forEach(m => {
                const shouldKeep = m.reasons.some(r => {
                    if (r.module.type === 'stylable') {
                        return false;
                    } else {
                        return chunk.containsModule(r.module);
                    }
                });
                if (!shouldKeep) {
                    if (m.chunksIterable.size === 1) {
                        if (m.buildInfo.isImportedByNonStylable) {
                            return;
                        }
                    }
                    chunk.removeModule(m);
                }
            });
        });
    }
    createChunkCSSBundle(chunk, compilation) {
        const bootstrap = chunk.stylableBootstrap;
        if (bootstrap) {
            const cssSources = bootstrap.renderStaticCSS(
                compilation.mainTemplate,
                compilation.hash
            );
            const cssBundleFilename = compilation.getPath(this.options.filename, {
                chunk,
                hash: compilation.hash
            });
            compilation.assets[cssBundleFilename] = new RawSource(cssSources.join(EOL + EOL + EOL));
            chunk.files.push(cssBundleFilename);
        }
    }
    createBootstrapModule(compiler, chunk, runtimeRendererModule) {
        const bootstrap = new StylableBootstrapModule(
            compiler.context,
            chunk,
            runtimeRendererModule,
            this.options.bootstrap
        );
        for (const module of chunk.modulesIterable) {
            if (module.type === 'stylable') {
                bootstrap.addStylableModuleDependency(module);
            }
        }
        return bootstrap;
    }
    injectStylableCompilation(compiler) {
        compiler.hooks.compilation.tap(
            StylableWebpackPlugin.name,
            (compilation, { normalModuleFactory }) => {
                compilation.dependencyFactories.set(StylableImportDependency, normalModuleFactory);
                compilation.dependencyFactories.set(StylableAssetDependency, normalModuleFactory);
                normalModuleFactory.hooks.createParser
                    .for('stylable')
                    .tap(StylableWebpackPlugin.name, () => {
                        return new StylableParser(
                            this.stylable,
                            compilation,
                            this.options.useWeakDeps
                        );
                    });
                normalModuleFactory.hooks.createGenerator
                    .for('stylable')
                    .tap(StylableWebpackPlugin.name, () => {
                        return new StylableGenerator(this.stylable, compilation, {
                            includeCSSInJS: this.options.includeCSSInJS,
                            experimentalHMR: this.options.experimentalHMR,
                            ...this.options.generate
                        });
                    });
            }
        );
    }
    injectStylableModuleRuleSet(compiler) {
        compiler.hooks.normalModuleFactory.tap(StylableWebpackPlugin.name, factory => {
            factory.ruleSet.rules.push(
                factory.ruleSet.constructor.normalizeRule(
                    {
                        test: /\.st\.css$/i,
                        type: 'stylable',
                        resolve: {
                            // mainFields: ["stylable"]
                        }
                    },
                    factory.ruleSet.references,
                    ''
                )
            );
        });
    }
    injectRuntimeCodeToMainTemplate(compiler, compilation) {
        compilation.mainTemplate.hooks.beforeStartup.tap(
            StylableWebpackPlugin.name,
            (source, chunk) => {
                const runtimeRendererModule = compilation.getModule(cssRuntimeRendererRequest);

                if (
                    !chunk.hasModuleInGraph(m => m === runtimeRendererModule) ||
                    this.options.bootstrap.autoInit === false
                ) {
                    return source;
                }

                const asyncChunks = chunk.getAllAsyncChunks();

                const stModules = getModuleInGraph(
                    chunk,
                    module => module.type === 'stylable',
                    testChunk => !asyncChunks.has(testChunk)
                );

                const bootstrap = new StylableBootstrapModule(
                    compiler.context,
                    null,
                    runtimeRendererModule,
                    this.options.bootstrap
                );

                for (const module of stModules) {
                    if (module.type === 'stylable') {
                        bootstrap.addStylableModuleDependency(module);
                    }
                }

                return bootstrap.source(null, compilation.runtimeTemplate).source() + '\n' + source;
            }
        );
    }
    injectInitToEntryModule(chunk, compilation, runtimeRendererModule) {
        if (chunk.hasEntryModule() && this.options.bootstrap.autoInit) {
            const last = _ => _[_.length - 1];
            const getEntryModule = () => {
                return chunk.entryModule instanceof MultiModule
                    ? last(chunk.entryModule.dependencies).module
                    : chunk.entryModule;
            };

            const injectModule = this.options.bootstrap.getAutoInitModule
                ? this.options.bootstrap.getAutoInitModule(chunk, compilation)
                : getEntryModule();

            const injected = injectModule.dependencies.find(
                dep => dep instanceof StyleableAutoInitDependency
            );
            if (injected) {
                return;
            }
            injectModule.addDependency(
                new StyleableAutoInitDependency(
                    runtimeRendererModule,
                    compilation.runtimeTemplate,
                    injectModule
                )
            );
        }
    }
}

module.exports = StylableWebpackPlugin;
