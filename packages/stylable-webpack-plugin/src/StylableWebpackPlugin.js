const { RawSource } = require("webpack-sources");
const { Stylable } = require("stylable");
const { connectChunkAndModule } = require("webpack/lib/GraphHelpers");
const { getCSSDepthAndDeps, isImportedByNonStylable } = require("./utils");
const { StylableBootstrapModule } = require("./StylableBootstrapModule");
const { cssRuntimeRendererRequest } = require("./runtime-dependencies");
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
      includeCSSInJS: true
    };
    return {
      ...defaults,
      ...options
    };
  }
  createStylable(compiler) {
    const stylable = new Stylable(
      compiler.context,
      compiler.inputFileSystem,
      this.options.requireModule,
      "--",
      undefined,
      undefined,
      this.options.transformHooks,
      this.options.rootScope,
      compiler.options.resolve
    );
    return stylable;
  }
  apply(compiler) {
    this.stylable = this.createStylable(compiler);
    this.injectStylableModuleRuleSet(compiler);
    this.injectStylableCompilation(compiler);
    this.injectStylableRuntimeInfo(compiler);
    this.injectStylableRuntimeChunk(compiler);
  }
  injectStylableRuntimeInfo(compiler) {
    compiler.hooks.compilation.tap(StylableWebpackPlugin.name, compilation => {
      compilation.hooks.optimizeModules.tap(
        StylableWebpackPlugin.name,
        modules => {
          modules.forEach(module => {
            if (module.type === "stylable") {
              module.buildInfo.runtimeInfo = getCSSDepthAndDeps(module);
              module.buildInfo.isImportedByNonStylable = isImportedByNonStylable(
                module
              );
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
              if (chunk.containsModule(runtimeRendererModule)) {
                const bootstrap = new StylableBootstrapModule(
                  compiler.context,
                  runtimeRendererModule
                );

                for (const module of chunk.modulesIterable) {
                  if (module.type === "stylable") {
                    bootstrap.addStylableModuleDependency(module);
                  }
                }

                chunksBootstraps.push([chunk, bootstrap]);
              }
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
                runtimeRendererModule
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
                compilation.addModule(bootstrap);
                bootstrap.addStylableModuleDependency(chunk.entryModule);
                connectChunkAndModule(chunk, bootstrap);
                chunk.entryModule = bootstrap;
              });
            }
          }
        );

        if (this.options.outputCSS) {
          compilation.hooks.additionalChunkAssets.tap(
            StylableWebpackPlugin.name,
            chunks => {
              chunks.forEach(chunk => {
                if (chunk.entryModule instanceof StylableBootstrapModule) {
                  const all = [];

                  const cssBundleFilename = compilation.getPath(
                    this.options.filename,
                    { chunk, hash: compilation.hash }
                  );

                  chunk.entryModule.dependencies.forEach(({ module }) => {
                    if (module.type === "stylable") {
                      all.push(module);
                    }
                  });

                  all.sort(
                    (a, b) =>
                      a.buildInfo.runtimeInfo.depth -
                      b.buildInfo.runtimeInfo.depth
                  );

                  const used = all.filter(
                    module => module.buildInfo.isImportedByNonStylable
                  );

                  // console.log(used, all);
                  const cssSources = all.map(module => {
                    const publicPath = compilation.mainTemplate.getPublicPath({
                      hash: compilation.hash
                    });

                    return module.generator.toCSS(module, assetModule => {
                      const source = assetModule.originalSource().source();
                      const getStaticPath = new Function(
                        ["__webpack_public_path__ "],
                        "var module = {}; return " + source
                      );
                      return JSON.stringify(getStaticPath(publicPath));
                    });
                  });

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
            return new StylableParser(this.stylable);
          });
        normalModuleFactory.hooks.createGenerator
          .for("stylable")
          .tap(StylableWebpackPlugin.name, () => {
            return new StylableGenerator(this.stylable, compilation, {
              includeCSSInJS: this.options.includeCSSInJS
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
