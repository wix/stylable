  exports.normalizeOptions = function normalizeOptions(options, mode) {
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
        afterTransform: null,
        ...options.generate
      },
      optimizeStylableModulesPerChunks: true,
      optimizer: undefined,
      optimize: {
        removeUnusedComponents: true,
        removeComments: isProd ? true : false,
        removeStylableDirectives: true,
        classNameOptimizations: isProd ? true : false,
        shortNamespaces: isProd ? true : false,
        removeEmptyNodes: isProd ? true : false,
        minify: isProd ? true : false,
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