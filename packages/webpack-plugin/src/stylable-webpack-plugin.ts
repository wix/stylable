import {
    Stylable,
    createDefaultResolver,
    isAsset,
    makeAbsolute,
    processDeclarationUrls,
    OnUrlCallback,
} from '@stylable/core';
import { resolveNamespace } from '@stylable/node';
import { StylableOptimizer } from '@stylable/optimizer';
import { EOL } from 'os';
import type webpack from 'webpack';
import { RawSource } from 'webpack-sources';
import { getModuleInGraph, hasStylableModuleInGraph } from './get-module-in-graph';
import { normalizeOptions } from './plugin-options';
import { RUNTIME_SOURCE, WEBPACK_STYLABLE } from './runtime-dependencies';
import { StylableBootstrapModule } from './stylable-bootstrap-module';
import { StylableAssetDependency, StylableImportDependency } from './stylable-dependencies';
import { StylableGenerator } from './stylable-generator';
import {
    calculateModuleDepthAndShallowStylableDependencies,
    renderStaticCSS,
} from './stylable-module-helpers';
import { StylableParser } from './stylable-parser';
import {
    StylableAutoInitDependency,
    StylableAutoInitDependencyTemplate,
} from './stylable-auto-init-dependency';
import type {
    CalcResult,
    ShallowPartial,
    StylableModule,
    StylableWebpackPluginOptions,
    WebpackAssetModule,
} from './types';
import { isImportedByNonStylable, rewriteUrl, isStylableModule } from './utils';
import { dirname } from 'path';
import findConfig from 'find-config';
import { hashContent } from './hash-content-util';

const { connectChunkAndModule } = require('webpack/lib/GraphHelpers');
const MultiModule = require('webpack/lib/MultiModule');
const last = <T>(_: T[]): any => _[_.length - 1];

export class StylableWebpackPlugin {
    public stylable!: Stylable;
    public options!: StylableWebpackPluginOptions;
    private userOptions: ShallowPartial<StylableWebpackPluginOptions>;

    constructor(options: ShallowPartial<StylableWebpackPluginOptions> = {}) {
        this.userOptions = options;
    }
    public apply(compiler: webpack.Compiler) {
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
    public normalizeOptions(mode?: webpack.Configuration['mode']) {
        this.options = normalizeOptions(this.userOptions, mode);
    }
    public overrideOptionsWithLocalConfig(context: string) {
        let fullOptions = this.options;
        const localConfig = this.loadLocalStylableConfig(context);
        if (localConfig && localConfig.options) {
            fullOptions = localConfig.options(fullOptions);
        }
        this.options = fullOptions;
    }
    public loadLocalStylableConfig(
        dir: string
    ):
        | undefined
        | { options: (o: Partial<StylableWebpackPluginOptions>) => StylableWebpackPluginOptions } {
        let localConfigOverride;
        try {
            localConfigOverride = findConfig.require('stylable.config', { cwd: dir });
        } catch (e) {
            /* no op */
        }
        return localConfigOverride;
    }
    public createStylable(compiler: webpack.Compiler) {
        const resolveModule = createDefaultResolver(
            compiler.inputFileSystem as any,
            compiler.options.resolve
        );
        const stylable = new Stylable(
            compiler.context,
            (compiler.inputFileSystem as any).fileSystem || (compiler.inputFileSystem as any),
            this.options.requireModule,
            '__',
            (meta, filePath) => {
                if (this.options.unsafeBuildNamespace) {
                    try {
                        meta.namespace = require(meta.source + '.js').namespace;
                    } catch {
                        /* */
                    }
                }

                // meta.namespace = getNamespaceFromBuiltStylsheet()
                // TODO: move to stylable as param.
                if (this.options.optimize.shortNamespaces) {
                    meta.namespace = stylable.optimizer!.namespaceOptimizer.getNamespace(
                        meta,
                        compiler.context,
                        stylable
                    );
                }
                if (this.options.onProcessMeta) {
                    return this.options.onProcessMeta(meta, filePath);
                }
                return meta;
            },
            undefined,
            this.options.transformHooks,
            compiler.options.resolve,
            this.options.optimizer || new StylableOptimizer(),
            compiler.options.mode as any,
            this.options.resolveNamespace || resolveNamespace,
            undefined,
            resolveModule
        );
        this.stylable = stylable;
    }
    public injectPlugins(compiler: webpack.Compiler) {
        if (this.options.plugins) {
            this.options.plugins.forEach((plugin) => plugin.apply(compiler, this));
        }
    }
    public injectStylableRuntimeInfo(compiler: webpack.Compiler) {
        compiler.hooks.compilation.tap(StylableWebpackPlugin.name, (compilation) => {
            compilation.hooks.optimizeModules.tap(StylableWebpackPlugin.name, (modules) => {
                const cache = new WeakMap<StylableModule, CalcResult>();
                modules.forEach((module) => {
                    if (isStylableModule(module)) {
                        if (!module.buildInfo.stylableAssetReplacement) {
                            this.processStylableModuleAssets(compilation, module);
                        }
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
    private processStylableModuleAssets(
        compilation: webpack.compilation.Compilation,
        module: StylableModule
    ) {
        if (!module.buildInfo.stylableTransformedAst) {
            return;
        }
        const rootContext = (compilation as any).options.context;
        const replacements: WebpackAssetModule[] = [];
        const moduleDir = dirname(module.resource);
        const onUrl: OnUrlCallback = (node) => {
            if (node.url !== undefined && isAsset(node.url)) {
                const resourcePath = makeAbsolute(node.url, rootContext, moduleDir);
                const assetModule = compilation.modules.find((_) => _.resource === resourcePath);
                if (assetModule) {
                    replacements.push(assetModule);
                    rewriteUrl(node, replacements.length - 1);
                } else {
                    node.url = resourcePath;
                    compilation.warnings.push(`Stylable missing asset: ${resourcePath}`);
                }
            }
        };
        module.buildInfo.stylableTransformedAst.walkDecls((decl) =>
            processDeclarationUrls(decl, onUrl, true)
        );
        module.buildInfo.stylableAssetReplacement = replacements;
    }

    public injectChunkOptimizer(compiler: webpack.Compiler) {
        if (this.options.optimizeStylableModulesPerChunks) {
            compiler.hooks.thisCompilation.tap(StylableWebpackPlugin.name, (compilation) => {
                compilation.hooks.afterOptimizeChunkIds.tap(
                    StylableWebpackPlugin.name,
                    (chunks) => {
                        this.optimizeChunks(chunks);
                    }
                );
            });
        }
    }
    public injectStylableCSSOptimizer(compiler: webpack.Compiler) {
        compiler.hooks.compilation.tap(StylableWebpackPlugin.name, (compilation) => {
            const used: StylableModule[] = [];
            const usageMapping: Record<string, boolean> = {};
            compilation.hooks.optimizeModules.tap(StylableWebpackPlugin.name, (modules) => {
                (modules as StylableModule[]).forEach((module) => {
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
                                    `Duplicate module namespace: ${module.buildInfo.stylableMeta.namespace} from ${module.resource}`
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
    public injectStylableRuntimeChunk(compiler: webpack.Compiler) {
        compiler.hooks.compilation.tap(StylableWebpackPlugin.name, (compilation) => {
            if (this.options.useEntryModuleInjection) {
                compilation.dependencyTemplates.set(
                    StylableAutoInitDependency as any,
                    new StylableAutoInitDependencyTemplate() as any
                );
                compilation.hooks.optimizeChunks.tap(StylableWebpackPlugin.name, (chunks) => {
                    chunks.forEach((chunk) => this.injectInitToEntryModule(chunk, compilation));
                });
            } else {
                this.injectRuntimeCodeToMainTemplate(compiler, compilation);
            }
            this.injectRuntimeSource(compiler, compilation);
        });

        compiler.hooks.thisCompilation.tap(StylableWebpackPlugin.name, (compilation) => {
            compilation.hooks.optimizeChunks.tap(StylableWebpackPlugin.name, (chunks) => {
                this.applyDeprecatedProcess(chunks, compiler, compilation);
            });

            if (this.options.outputCSS) {
                compilation.hooks.additionalChunkAssets.tap(
                    StylableWebpackPlugin.name,
                    (chunks) => {
                        chunks.forEach((chunk) => {
                            this.createChunkCSSBundle(chunk, compilation);
                        });
                    }
                );
            }
        });
    }
    public applyDeprecatedProcess(
        chunks: webpack.compilation.Chunk[],
        compiler: webpack.Compiler,
        compilation: webpack.compilation.Compilation
    ) {
        const containStylableModules = chunks.some((chunk) => hasStylableModuleInGraph(chunk));

        if (!containStylableModules) {
            return;
        }
        const chunksBootstraps = chunks.map((chunk) => this.createBootstrapModule(compiler, chunk));
        if (chunksBootstraps.length === 0) {
            return;
        }
        if (this.options.createRuntimeChunk) {
            const extractedStylableChunk = (compilation as any).addChunk('stylable-css-runtime');
            const extractedBootstrap = new StylableBootstrapModule(
                compiler.context,
                extractedStylableChunk,
                null,
                this.options.bootstrap
            );
            chunksBootstraps.forEach((bootstrap) => {
                bootstrap.chunk!.split(extractedStylableChunk);
                bootstrap.dependencies.forEach((dep) => {
                    extractedBootstrap.dependencies.push(dep);
                    bootstrap.chunk!.moveModule(dep.module, extractedStylableChunk);
                });
            });
            (compilation.addModule as any)(extractedBootstrap);
            connectChunkAndModule(extractedStylableChunk, extractedBootstrap);
            extractedStylableChunk.entryModule = extractedBootstrap;
            extractedStylableChunk.stylableBootstrap = extractedBootstrap;
        } else {
            chunksBootstraps.forEach((bootstrap) => {
                (bootstrap.chunk as any).stylableBootstrap = bootstrap;
            });
        }
    }
    public optimizeChunks(chunks: webpack.compilation.Chunk[]) {
        chunks.forEach((chunk) => {
            const stModules = Array.from(chunk.modulesIterable).filter(
                (m) => m.type === 'stylable'
            );

            stModules.forEach((m) => {
                const shouldKeep = m.reasons.some((r) => {
                    if (r.module.type === 'stylable') {
                        return false;
                    } else {
                        return chunk.containsModule(r.module);
                    }
                });
                if (!shouldKeep) {
                    if ((m as any).chunksIterable.size === 1) {
                        if (m.buildInfo.isImportedByNonStylable) {
                            return;
                        }
                    }
                    chunk.removeModule(m);
                }
            });
        });
    }
    public createChunkCSSBundle(
        chunk: webpack.compilation.Chunk,
        compilation: webpack.compilation.Compilation
    ) {
        if (this.options.includeDynamicModulesInCSS) {
            if (!chunk.isOnlyInitial() && this.options.skipDynamicCSSEmit) {
                return;
            }
            const stModules = getModuleInGraph(chunk, (module) => module.type === 'stylable');
            if (stModules.size !== 0) {
                const cssSources = renderStaticCSS(
                    [...stModules],
                    compilation.mainTemplate,
                    chunk.hash || compilation.hash
                );
                const source = cssSources.join(EOL);

                const cssBundleFilename = compilation.getPath(this.options.filename, {
                    chunk,
                    hash: compilation.hash,
                    contentHash: hashContent(source),
                });
                compilation.assets[cssBundleFilename] = new RawSource(source);
                chunk.files.push(cssBundleFilename);
            }
        } else {
            const bootstrap: StylableBootstrapModule = (chunk as any).stylableBootstrap;
            if (bootstrap) {
                const cssSources = bootstrap.renderStaticCSS(
                    compilation.mainTemplate,
                    compilation.hash
                );
                const source = cssSources.join(EOL);
                const cssBundleFilename = compilation.getPath(this.options.filename, {
                    chunk,
                    hash: compilation.hash,
                    contentHash: hashContent(source),
                });
                compilation.assets[cssBundleFilename] = new RawSource(source);
                chunk.files.push(cssBundleFilename);
            }
        }
    }
    public createBootstrapModule(compiler: webpack.Compiler, chunk: webpack.compilation.Chunk) {
        const bootstrap = new StylableBootstrapModule(
            compiler.context,
            chunk,
            null,
            this.options.bootstrap
        );
        for (const module of chunk.modulesIterable) {
            if (module.type === 'stylable') {
                bootstrap.addStylableModuleDependency(module as StylableModule);
            }
        }
        return bootstrap;
    }
    public injectStylableCompilation(compiler: webpack.Compiler) {
        compiler.hooks.compilation.tap(
            StylableWebpackPlugin.name,
            (compilation, { normalModuleFactory }) => {
                compilation.dependencyFactories.set(
                    StylableImportDependency as any,
                    normalModuleFactory
                );
                compilation.dependencyFactories.set(
                    StylableAssetDependency as any,
                    normalModuleFactory
                );
                normalModuleFactory.hooks.createParser
                    .for('stylable')
                    .tap(StylableWebpackPlugin.name, () => {
                        return new StylableParser(
                            this.stylable,
                            compilation,
                            normalModuleFactory,
                            this.options.useWeakDeps
                        );
                    });

                normalModuleFactory.hooks.createGenerator
                    .for('stylable')
                    .tap(StylableWebpackPlugin.name, () => {
                        return new StylableGenerator(
                            this.stylable,
                            compilation,
                            normalModuleFactory,
                            {
                                includeCSSInJS: this.options.includeCSSInJS,
                                experimentalHMR: this.options.experimentalHMR,
                                diagnosticsMode: this.options.diagnosticsMode,
                                ...this.options.generate,
                            }
                        );
                    });
            }
        );
    }
    public injectStylableModuleRuleSet(compiler: webpack.Compiler) {
        compiler.hooks.normalModuleFactory.tap(StylableWebpackPlugin.name, (factory: any) => {
            factory.ruleSet.rules.push(
                factory.ruleSet.constructor.normalizeRule(
                    {
                        test: /\.st\.css$/i,
                        type: 'stylable',
                        resolve: {
                            // mainFields: ["stylable"]
                        },
                    },
                    factory.ruleSet.references,
                    ''
                )
            );
        });
    }
    public injectRuntimeCodeToMainTemplate(
        compiler: webpack.Compiler,
        compilation: webpack.compilation.Compilation
    ) {
        (compilation.mainTemplate as any).hooks.beforeStartup.tap(
            StylableWebpackPlugin.name,
            (source: string, chunk: webpack.compilation.Chunk) => {
                if (!hasStylableModuleInGraph(chunk) || this.options.bootstrap.autoInit === false) {
                    return source;
                }

                const asyncChunks = chunk.getAllAsyncChunks();

                const stModules = getModuleInGraph(
                    chunk,
                    (module) => module.type === 'stylable',
                    (testChunk) => !asyncChunks.has(testChunk)
                );

                const bootstrap = new StylableBootstrapModule(
                    compiler.context,
                    null,
                    null,
                    this.options.bootstrap
                );

                if (!(compilation as any).options.optimization.runtimeChunk) {
                    for (const module of stModules) {
                        if (module.type === 'stylable') {
                            bootstrap.addStylableModuleDependency(module);
                        }
                    }
                }

                return bootstrap.source(null, compilation.runtimeTemplate).source() + '\n' + source;
            }
        );
    }
    public injectRuntimeSource(
        _compiler: webpack.Compiler,
        compilation: webpack.compilation.Compilation
    ) {
        (compilation.mainTemplate as any).hooks.beforeStartup.tap(
            StylableWebpackPlugin.name,
            (source: string, chunk: webpack.compilation.Chunk) => {
                if (!hasStylableModuleInGraph(chunk)) {
                    return source;
                }

                if (this.options.runtimeMode === 'isolated') {
                    return `${RUNTIME_SOURCE};\n${WEBPACK_STYLABLE} = StylableRuntime();\n${source}`;
                } else {
                    const id = this.options.globalRuntimeId;
                    const globalObj = compilation.outputOptions.globalObject;

                    const injected = `${globalObj}["${id}"] = ${WEBPACK_STYLABLE} = ${globalObj}["${id}"] || StylableRuntime();\n${source}`;
                    if (this.options.runtimeMode === 'shared') {
                        return `${RUNTIME_SOURCE};\n${injected}`;
                    } else {
                        // external
                        return injected;
                    }
                }
            }
        );
    }
    public injectInitToEntryModule(
        chunk: webpack.compilation.Chunk,
        compilation: webpack.compilation.Compilation
    ) {
        if (
            chunk.hasEntryModule() &&
            hasStylableModuleInGraph(chunk) &&
            this.options.bootstrap.autoInit
        ) {
            const getEntryModule = (): webpack.compilation.Module => {
                return chunk.entryModule && chunk.entryModule instanceof MultiModule
                    ? last((chunk.entryModule as any).dependencies).module
                    : chunk.entryModule;
            };
            const injectModule = this.options.bootstrap.getAutoInitModule
                ? this.options.bootstrap.getAutoInitModule(chunk, compilation)
                : getEntryModule();

            const injected = injectModule.dependencies.find(
                (dep: webpack.compilation.Dependency) => dep instanceof StylableAutoInitDependency
            );
            if (injected) {
                return;
            }
            injectModule.addDependency(new StylableAutoInitDependency(injectModule));
        }
    }
}
