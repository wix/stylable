### Add webpack v5 support to Stylable - WIP

Our new webpack integration features many improvements from previous versions.

1. Better code tree shaking and inlining support

previously in webpack v4 stylable modules looked like this:
```js
module.export = stylableRuntime.create({...})
```

This did not allow webpack to optimize the usage of exports from the module. 
In webpack v5 Stylable modules use `esm exports` and opt in to be fully optimized by webpack, this means much smaller bundle size.

2. Smaller runtime size and memory usage

3. Better off the shelf inclusion of necessary stylesheets in the build.  
Auto include imported `@keyframes` and composition (extending of classes) usage. 

4. Support `mini-css-extract-plugin` flow - allow the plugin to emit css assets through `mini-css-extract-plugin` CSSModule mechanism. 

5. Better error reporting for duplicate namespaces

## Breaking changes

Most of the breaking changes are in the API structure and should not affect the behavior of the application. 

1. Drop `node v10` support 

2. Plugin configuration options have been simplified

```ts
interface Options {
    filename?: string;
    cssInjection?: 'js' | 'css' | 'mini-css';
    assetsMode?: 'url' | 'loader';
    runtimeStylesheetId?: 'module' | 'namespace';
    diagnosticsMode?: 'auto' | 'strict' | 'loose';
    runtimeId?: string;
    optimize?: OptimizeOptions;
    optimizer?: StylableOptimizer;
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

* `filename` - the default Stylable extraction process is not aware of chunks and extracts all css to a single bundle. the filename option cannot use the `[name]` replacer and only supports `[contenthash]` and `[fullHash]`

* `assetsMode` - until official deprecation of the asset loaders (`url-loader` and `file-loader`) this option allows to opt-in into the old asset loader mechanism for stylable modules.  
It is not recommended to use in webpack v5. (see https://webpack.js.org/guides/asset-modules/)

* `runtimeStylesheetId` - defaults to `namespace` in production mode

* `stylable.config.js` API change - the Stylable configuration now uses the `webpackPlugin` export to allow configuring the Stylable webpack plugin

```js
module.exports.webpackPlugin = function(currentConfig) {
    const overrides = {...};
    return {
        ...currentConfig,
        ...overrides
    };
}
```

3. Optimizer

The API has changed and now all optimization happens on built css. The main behavior change is that `shortNamespaces` is now performed on state classes inside the AST optimization and not during the process step. This means that the namespaces are now deterministic to the depth of the stylesheet.

* Removed `ClassNameOptimizer` - use optimizer.getClassName(className)
* Removed `NamespaceNameOptimizer` - use optimizer.getNamespace(namespace)

