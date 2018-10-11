const { EOL } = require("os");
const { RawSource } = require("webpack-sources");
const { Stylable } = require("@stylable/core");
const { StylableOptimizer } = require("@stylable/core/dist/src/optimizer/stylable-optimizer");
const findConfig = require("find-config");
const { connectChunkAndModule } = require("webpack/lib/GraphHelpers");
const { isImportedByNonStylable } = require("./utils");
const {
  renderStaticCSS,
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
    this.options.splitCSSByDepth ? this.injectSplitCSSChunksByDepth(compiler) : this.injectStylableRuntimeChunk(compiler);
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
      compiler.options.resolve,
      this.options.optimizer || new StylableOptimizer(),
      compiler.options.mode
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
  injectChunkOptimizer(compiler) {
    if(this.options.optimizeStylableModulesPerChunks) {
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
  injectSplitCSSChunksByDepth(compiler) {
    compiler.hooks.thisCompilation.tap(
      StylableWebpackPlugin.name,
      (compilation, data) => {
        
      const actions = [];
      const ID_PREFIX = "stylable-depth_";
      compilation.hooks.afterOptimizeChunkIds.tap(StylableWebpackPlugin.name, chunks => {
        function getDepth(module) {
          return module.buildInfo.runtimeInfo.depth;
        }
        const chunkDepthMap = {};
        const modulesByDepth = {};
        
        chunks.forEach((chunk) => {
          [...chunk.modulesIterable].forEach((module) => {
            if (module.type === 'stylable') {
              const d = getDepth(module);
              chunkDepthMap[d] = chunkDepthMap[d] || new Set();
              chunkDepthMap[d].add(chunk);
              modulesByDepth[d] = modulesByDepth[d] || []
              modulesByDepth[d].push(module)
            }
          });
        });

        Object.keys(chunkDepthMap).sort((a, b) => Number(a) - Number(b)).forEach((depth) => {
          const id = ID_PREFIX + depth;
          const extractedStylableChunk = compilation.addChunk(id);
          const css = renderStaticCSS(modulesByDepth[depth], compilation.mainTemplate, compilation.hash);
          compilation.assets[id + '.css'] = new RawSource(css.join('\n'));
          extractedStylableChunk.id = id;
          extractedStylableChunk.ids = [id];
          [...chunkDepthMap[depth]].forEach((chunk) => {
            // not main chunks (dynamic, async)
            if (!chunk.hasRuntime()) {
              chunk.split(extractedStylableChunk);
            }
            else {
              actions.push(() => {
                chunk.files.push(id + '.css');
              });
            }
          });
        });
      });
      compilation.hooks.additionalChunkAssets.tap(StylableWebpackPlugin.name, chunks => {
        actions.forEach((fn) => fn());
      });
      compilation.hooks.optimizeAssets.tap(StylableWebpackPlugin.name, assets => {
        for (const k in assets) {
          if (k.startsWith(ID_PREFIX) && !k.endsWith('.css')) {
            delete assets[k];
          }
        }
      });
      compilation.mainTemplate.hooks.requireExtensions.tap(StylableWebpackPlugin.name, source => {
        return (source +
          `\n
              const loadedCSSChunks = {};
              __webpack_require__.lcss = function load(id) {
                  const status = loadedCSSChunks[id];
                  if(status) { return status; }
                  return loadedCSSChunks[id] = new Promise((res)=> {      
                      const link = document.createElement('link');
                      link.href = id + '.css';
                      link.rel = 'stylesheet';
                      link.stylableDepth = Number(id.split('_').pop());
                      link.addEventListener('load', check)
                      
                      for(var i = 0; i < document.head.children.length; i++){
                        const el = document.head.children[i];
                        if(el.tagName === 'LINK') {
                          const m = el.href.match(/${ID_PREFIX}(\\d+).css/);
                          if(m && Number(m[1]) === link.stylableDepth) {
                            return res();
                          }
                          if(m && Number(m[1]) > link.stylableDepth) {
                            document.head.insertBefore(link, el);
                            break;
                          }
                        }
                      }
                      if(!link.parentNode){
                        document.head.appendChild(link)
                      }
                      
                  
                      function check() {
                          if (link.sheet) {
                            link.removeEventListener('load', check)
                            res();
                          } else {
                            setTimeout(check, 0)
                          }
                      }
                  })
              }
            \n`);
      });
      compilation.mainTemplate.hooks.requireEnsure.tap(StylableWebpackPlugin.name, source => {
        return (`if(String.prototype.startsWith.call(chunkId, "${ID_PREFIX}")){
                return __webpack_require__.lcss(chunkId)
              }\n${source}`);
      });
    })
  }
  optimizeChunks(chunks) {
    chunks.forEach(chunk => {
      const stModules = Array.from(chunk.modulesIterable).filter(m => {
        return m.type === "stylable";
      });

      stModules.forEach(m => {
        const shouldKeep = m.reasons.some(r => {
          if (r.module.type === "stylable") {
            return false;
          } else {
            return chunk.containsModule(r.module);
          }
        });
        if (!shouldKeep) {
          // console.log(`REMOVED ${m.resource} from ${chunk.name}`);
          if (m.chunksIterable.size === 1) {
            if (m.buildInfo.isImportedByNonStylable) {
              // console.log(`REMOVED LAST ${m.resource}`);
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
