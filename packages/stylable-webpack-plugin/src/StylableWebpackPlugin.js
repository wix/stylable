const { RawSource } = require("webpack-sources");
const { Stylable } = require("stylable");
const findConfig = require("find-config");
const { connectChunkAndModule } = require("webpack/lib/GraphHelpers");
const { isImportedByNonStylable } = require("./utils");
const {
  calculateModuleDepthAndShallowStylableDependencies
} = require("./stylable-module-helpers");
const { StylableBootstrapModule } = require("./StylableBootstrapModule");
const { cssRuntimeRendererRequest } = require("./runtime-dependencies");
const { WebpackStylableOptimizer } = require("./extended-stylable-optimizer");
const StylableParser = require("./StylableParser");
const StylableGenerator = require("./StylableGenerator");
const {
  StylableImportDependency,
  StylableAssetDependency
} = require("./StylableDependencies");

class StylableWebpackPlugin {
  constructor(options) {
    this.options = this.normalizeOptions(options);
  }
  apply(compiler) {
    this.overrideOptionsWithLocalConfig(compiler.context);
    this.stylable = this.createStylable(compiler);
    this.injectStylableModuleRuleSet(compiler);
    this.injectStylableCompilation(compiler);
    this.injectStylableRuntimeInfo(compiler);
    this.injectStylableRuntimeChunk(compiler);
    this.injectPlugins(compiler);
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
      localConfigOverride = findConfig.require("stylable.config", { cwd: dir });
    } catch (e) {
      /* no op */
    }
    return localConfigOverride;
  }
  normalizeOptions(options = {}) {
    const defaults = {
      requireModule: id => {
        delete require.cache[id];
        return require(id);
      },
      transformHooks: undefined,
      rootScope: true,
      createRuntimeChunk: false,
      filename: "[name].bundle.css",
      outputCSS: false,
      includeCSSInJS: true,
      bootstrap: {
        autoInit: true,
        ...options.bootstrap
      },
      generate: {
        optimizer: new WebpackStylableOptimizer(),
        ...options.generate
      },
      optimize: {
        removeUnusedComponents: true,
        removeComments: false,
        removeStylableDirectives: true,
        classNameOptimizations: false,
        shortNamespaces: false,
        ...options.optimize
      },
      plugins: []
    };

    return {
      ...defaults,
      ...options,
      optimize: defaults.optimize,
      bootstrap: defaults.bootstrap,
      generate: defaults.generate
    };
  }
  createStylable(compiler) {
    const {
      generate: { optimizer },
      optimize
    } = this.options;
    const stylable = new Stylable(
      compiler.context,
      compiler.inputFileSystem,
      this.options.requireModule,
      "--",
      meta => {
        if (optimize.shortNamespaces) {
          if (optimizer && optimizer.namespaceOptimizer) {
            meta.namespace = optimizer.namespaceOptimizer.getNamespace(
              meta,
              compiler,
              this
            );
          } else {
            throw new Error('Missing namespaceOptimizer: "shortNamespaces"');
          }
        }
        return meta;
      },
      undefined,
      this.options.transformHooks,
      this.options.rootScope,
      compiler.options.resolve
    );
    return stylable;
  }
  injectPlugins(compiler) {
    this.options.plugins.forEach(plugin => plugin.apply(compiler, this));
  }
  injectStylableRuntimeInfo(compiler) {
    compiler.hooks.compilation.tap(StylableWebpackPlugin.name, compilation => {
      compilation.hooks.optimizeModules.tap(
        StylableWebpackPlugin.name,
        modules => {
          const cache = new WeakMap();
          modules.forEach(module => {
            if (module.type === "stylable") {
              module.buildInfo.runtimeInfo = calculateModuleDepthAndShallowStylableDependencies(
                module,
                [],
                [],
                cache
              );
              module.buildInfo.isImportedByNonStylable = isImportedByNonStylable(
                module
              );
            }
          });
        }
      );
    });
    this.injectStylableCSSOptimizer(compiler);
  }
  injectStylableCSSOptimizer(compiler) {
    compiler.hooks.compilation.tap(StylableWebpackPlugin.name, compilation => {
      const used = [];
      const usageMapping = {};
      compilation.hooks.optimizeModules.tap(
        StylableWebpackPlugin.name,
        modules => {
          modules.forEach(module => {
            if (module.type === "stylable") {
              module.buildInfo.optimize = this.options.optimize;
              module.buildInfo.usageMapping = usageMapping;
              module.buildInfo.usedStylableModules = used;
              if (module.buildInfo.isImportedByNonStylable) {
                used.push(module);
              }
              if (usageMapping[module.buildInfo.stylableMeta.namespace]) {
                throw new Error(
                  `Duplicate module namespace: ${module.buildInfo.stylableMeta.namespace} from ${module.resource}`
                );
              }
              usageMapping[module.buildInfo.stylableMeta.namespace] =
                module.buildInfo.isImportedByNonStylable;
            }
          });
        }
      );
    });
  }
  injectStylableRuntimeChunk(compiler) {
    compiler.hooks.thisCompilation.tap(
      StylableWebpackPlugin.name,
      (compilation, data) => {
        compilation.hooks.optimizeChunks.tap(
          StylableWebpackPlugin.name,
          chunks => {
            const runtimeRendererModule = compilation.getModule(
              cssRuntimeRendererRequest
            );

            if (!runtimeRendererModule) {
              return;
            }

            const createRuntimeChunk = this.options.createRuntimeChunk;

            const chunksBootstraps = [];
            chunks.forEach(chunk => {
              // if (chunk.containsModule(runtimeRendererModule)) {
              const bootstrap = new StylableBootstrapModule(
                compiler.context,
                runtimeRendererModule,
                this.options.bootstrap
              );

              for (const module of chunk.modulesIterable) {
                if (module.type === "stylable") {
                  bootstrap.addStylableModuleDependency(module);
                }
              }

              if (bootstrap.dependencies.length) {
                chunksBootstraps.push([chunk, bootstrap]);
              }
              // if (bootstrap.dependencies.length && chunk.entryModule) {
              // chunksBootstraps.push([chunk, bootstrap]);
              // }
              // }
            });

            if (chunksBootstraps.length === 0) {
              return;
            }

            if (createRuntimeChunk) {
              const extractedStylableChunk = compilation.addChunk(
                "stylable-css-runtime"
              );

              const extractedBootstrap = new StylableBootstrapModule(
                compiler.context,
                runtimeRendererModule,
                this.options.bootstrap
              );

              chunksBootstraps.forEach(([chunk, bootstrap]) => {
                chunk.split(extractedStylableChunk);
                bootstrap.dependencies.forEach(dep => {
                  extractedBootstrap.dependencies.push(dep);
                  chunk.moveModule(dep.module, extractedStylableChunk);
                });
              });

              compilation.addModule(extractedBootstrap);
              connectChunkAndModule(extractedStylableChunk, extractedBootstrap);
              extractedStylableChunk.entryModule = extractedBootstrap;
            } else {
              chunksBootstraps.forEach(([chunk, bootstrap]) => {
                // this is here for metadata to generate assets
                chunk.stylableBootstrap = bootstrap;
                if (chunk.entryModule) {
                  compilation.addModule(bootstrap);
                  connectChunkAndModule(chunk, bootstrap);
                  bootstrap.addStylableModuleDependency(chunk.entryModule);
                  bootstrap.setEntryReplacement(chunk.entryModule);
                  chunk.entryModule = bootstrap;
                }
              });
            }
          }
        );

        if (this.options.outputCSS) {
          compilation.hooks.additionalChunkAssets.tap(
            StylableWebpackPlugin.name,
            chunks => {
              chunks.forEach(chunk => {
                const bootstrap =
                  chunk.entryModule instanceof StylableBootstrapModule
                    ? chunk.entryModule
                    : chunk.stylableBootstrap;

                if (bootstrap) {
                  const cssSources = bootstrap.renderStaticCSS(
                    compilation.mainTemplate,
                    compilation.hash
                  );

                  const cssBundleFilename = compilation.getPath(
                    this.options.filename,
                    { chunk, hash: compilation.hash }
                  );

                  compilation.assets[cssBundleFilename] = new RawSource(
                    cssSources.join("\n\n\n")
                  );

                  chunk.files.push(cssBundleFilename);
                }
              });
            }
          );
        }
      }
    );
  }
  injectStylableCompilation(compiler) {
    compiler.hooks.compilation.tap(
      StylableWebpackPlugin.name,
      (compilation, { normalModuleFactory }) => {
        compilation.dependencyFactories.set(
          StylableImportDependency,
          normalModuleFactory
        );
        compilation.dependencyFactories.set(
          StylableAssetDependency,
          normalModuleFactory
        );
        normalModuleFactory.hooks.createParser
          .for("stylable")
          .tap(StylableWebpackPlugin.name, () => {
            return new StylableParser(this.stylable, compilation);
          });
        normalModuleFactory.hooks.createGenerator
          .for("stylable")
          .tap(StylableWebpackPlugin.name, () => {
            return new StylableGenerator(this.stylable, compilation, {
              includeCSSInJS: this.options.includeCSSInJS,
              ...this.options.generate
            });
          });
      }
    );
  }
  injectStylableModuleRuleSet(compiler) {
    compiler.hooks.normalModuleFactory.tap(
      StylableWebpackPlugin.name,
      factory => {
        factory.ruleSet.rules.push(
          factory.ruleSet.constructor.normalizeRule(
            {
              test: /\.st\.css$/i,
              type: "stylable",
              resolve: {
                // mainFields: ["stylable"]
              }
            },
            factory.ruleSet.references,
            ""
          )
        );
      }
    );
  }
}

module.exports = StylableWebpackPlugin;
