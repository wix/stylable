const { EOL } = require("os");
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
  constructor(options = {}) {
    this.userOptions = options;
    this.options = null;
  }
  apply(compiler) {
    this.normalizeOptions(compiler.options.mode);
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
  normalizeOptions(mode) {
    const options = this.userOptions;
    const isProd = mode === 'production';
    const defaults = {
      requireModule: id => {
        delete require.cache[id];
        return require(id);
      },
      transformHooks: undefined,
      rootScope: true,
      createRuntimeChunk: false,
      filename: "[name].bundle.css",
      outputCSS: isProd ? true : false,
      includeCSSInJS: isProd ? false : true,
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
        removeComments: isProd ? true : false,
        removeStylableDirectives: true,
        classNameOptimizations: isProd ? true : false,
        shortNamespaces: isProd ? true : false,
        ...options.optimize
      },
      plugins: []
    };

    this.options = {
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

        compilation.mainTemplate.hooks.startup.tap(
          StylableWebpackPlugin.name,
          (source, chunk) => {
            if (chunk.stylableBootstrap) {
              const id = compilation.runtimeTemplate.moduleId({
                module: chunk.stylableBootstrap,
                request: chunk.stylableBootstrap.name
              });
              return `__webpack_require__(${id});\n${source}`
            }
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
                if (bootstrap.chunk.entryModule) {
                  compilation.addModule(bootstrap);
                  connectChunkAndModule(bootstrap.chunk, bootstrap);
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
                const bootstrap = chunk.stylableBootstrap;

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
                    cssSources.join(EOL + EOL + EOL)
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
