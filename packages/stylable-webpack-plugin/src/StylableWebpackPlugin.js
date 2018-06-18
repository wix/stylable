const { EOL } = require("os");
const { RawSource } = require("webpack-sources");
const { Stylable } = require("stylable");
const { StylableOptimizer } = require("stylable/dist/src/optimizer/stylable-optimizer");
const findConfig = require("find-config");
const { connectChunkAndModule } = require("webpack/lib/GraphHelpers");
const { isImportedByNonStylable } = require("./utils");
const {
  calculateModuleDepthAndShallowStylableDependencies
} = require("./stylable-module-helpers");
const { normalizeOptions } = require("./PluginOptions");
const { StylableBootstrapModule } = require("./StylableBootstrapModule");
const { cssRuntimeRendererRequest } = require("./runtime-dependencies");
const StylableParser = require("./StylableParser");
const StylableGenerator = require("./StylableGenerator");
const {
  StylableImportDependency,
  StylableAssetDependency
} = require("./StylableDependencies");

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
      localConfigOverride = findConfig.require("stylable.config", { cwd: dir });
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
      "--",
      meta => { // TODO: move to stylable as param. 
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
      this.options.rootScope,
      compiler.options.resolve,
      this.options.optimizer || new StylableOptimizer()
    );
    this.stylable = stylable;
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
              // module.factoryMeta.sideEffectFree = !module.buildInfo.isImportedByNonStylable;
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
            if (module.type === "stylable" && module.buildInfo.stylableMeta) {
              module.buildInfo.optimize = this.options.optimize;
              module.buildInfo.usageMapping = usageMapping;
              module.buildInfo.usedStylableModules = used;
              if (module.buildInfo.isImportedByNonStylable) {
                used.push(module);
              }
              if (usageMapping[module.buildInfo.stylableMeta.namespace]) {
                compilation.errors.push(new Error(
                  `Duplicate module namespace: ${module.buildInfo.stylableMeta.namespace} from ${module.resource}`
                ));
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

        compilation.mainTemplate.hooks.startup.tap(
          StylableWebpackPlugin.name,
          (source, chunk) => {
            const runtimeRendererModule = compilation.getModule(
              cssRuntimeRendererRequest
            );

            if (!chunk.containsModule(runtimeRendererModule)) {
              return source;
            }

            const bootstrap = this.createBootstrapModule(compiler, chunk, runtimeRendererModule);
            return bootstrap.source(null, compilation.runtimeTemplate).source() + '\n' + source
          }
        )

        compilation.hooks.optimizeChunks.tap(
          StylableWebpackPlugin.name,
          chunks => {
            const runtimeRendererModule = compilation.getModule(
              cssRuntimeRendererRequest
            );

            if (!runtimeRendererModule) {
              return;
            }

            const chunksBootstraps = chunks.map(chunk => this.createBootstrapModule(compiler, chunk, runtimeRendererModule));

            if (chunksBootstraps.length === 0) {
              return;
            }

            if (this.options.createRuntimeChunk) {
              const extractedStylableChunk = compilation.addChunk(
                "stylable-css-runtime"
              );

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
                // if (bootstrap.chunk.entryModule) {
                //   compilation.addModule(bootstrap);
                //   connectChunkAndModule(bootstrap.chunk, bootstrap);
                // }
              });
            }
          }
        );

        if (this.options.outputCSS) {
          compilation.hooks.additionalChunkAssets.tap(
            StylableWebpackPlugin.name,
            chunks => {
              chunks.forEach(chunk => {
                this.createChunkCSSBundle(chunk, compilation);
              });
            }
          );
        }
      }
    );
  }
  createChunkCSSBundle(chunk, compilation) {
    const bootstrap = chunk.stylableBootstrap;
    if (bootstrap) {
      const cssSources = bootstrap.renderStaticCSS(compilation.mainTemplate, compilation.hash);
      const cssBundleFilename = compilation.getPath(this.options.filename, { chunk, hash: compilation.hash });
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
      if (module.type === "stylable") {
        bootstrap.addStylableModuleDependency(module);
      }
    }
    return bootstrap;
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
