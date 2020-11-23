With webpack 5 support for Stylable we bring many improvements for the webpack integration.


1. Better tree shaking and inlining support

previously in webpack 4 stylable modules looked like this
```js
module.export = stylableRuntime.create({...})
```

This did not allow webpack to optimize the usage of exports form the module. 
In webpack 5 Stylable modules uses `esm exports` and opt in to be fully optimized by webpack
This means much smaller bundle size.

2. Smaller runtime size and memory usage.

3. Better of the shelf inclusion of necessary stylesheets in the build

Auto include imported @keyframes and compose (extending of classes) usage. 

4. Support for `mini-css-extract-plugin`.

Allow the plugin to emit css assets through `mini-css-extract-plugin` CSSModule mechanism. 

5. Better error reporting for duplicate namespaces


## Braking changes.

Most of the breaking changes are in the API structure and should not affect the behavior of the application. 


1. Plugin options have been simplified. 

```ts
interface Options {
    filename?: string;
    cssInjection?: 'js' | 'css' | 'mini-css';
    assetsMode?: 'url' | 'loader';
    runtimeStylesheetId?: 'module' | 'namespace';
    diagnosticsMode?: 'auto' | 'strict' | 'loose';
    runtimeId?: string;
    optimize?: OptimizeOptions;
    stylableConfig?: (config: StylableConfig, compiler: Compiler) => StylableConfig;
    unsafeMuteDiagnostics?: {
        DUPLICATE_MODULE_NAMESPACE?: boolean;
    };
}

interface OptimizeOptions {
    removeComments?: boolean;
    removeStylableDirectives?: boolean;
    removeUnusedComponents?: boolean;
    classNameOptimizations?: boolean;
    removeEmptyNodes?: boolean;
    shortNamespaces?: boolean;
    minify?: boolean;
}

```

* `filename` - Since the default Stylable extraction process does not aware of chunks and extract all the css to a single bundle 
the filename option cannot use the `[name]` replacer and only supports `[contenthash]` and `[fullHash]`

* `assetsMode` - Until official deprecation of the asset loaders `url-loader` and `file-loader` this option will allow to opt-in into old asset loader mechanism for stylable modules.
It is not recommended to use it in webpack5 (see https://webpack.js.org/guides/asset-modules/)
 
* runtimeStylesheetId - will use the `namespace` option in production build

* local `stylable.config.js` API changes and now the webpack configuration will use the `webpackPlugin` export to config the webpack plugin.

```js
module.exports.webpackPlugin = function(currentConfig) {
    const overrides = {...};
    return {
        ...currentConfig,
        ...overrides
    };
}
```





