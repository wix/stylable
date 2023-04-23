# @stylable/webpack-plugin

[![npm version](https://img.shields.io/npm/v/@stylable/webpack-plugin.svg)](https://www.npmjs.com/package/@stylable/webpack-plugin)

`@stylable/webpack-plugin` (for webpack `^5.30.0`) is the main build utility for [Stylable](https://stylable.io/). It supports both development and production modes, providing various configurations that can be tweaked according to your specific needs. It enables loading Stylable files (`.st.css`) from local projects or imported from a 3rd party source (for example, NPM node modules).

## Getting started
Install `@stylable/webpack-plugin` as a dev dependency in your local project.

Install using npm:
```bash
npm install @stylable/webpack-plugin --save-dev
```

Install using yarn:
```bash
yarn add @stylable/webpack-plugin --dev
```

 Sample dev config:
```js
// webpack.config.js
module.exports = {
  …
  plugins: [new StylableWebpackPlugin()]
  …
};
```
## Plugin Configuration Options
Some of the default values given to configuration parameters depend on what environment mode is currently active in webpack (`development` or `production`).
Below you can see the various possible configuration parameters.

```ts
interface StylableWebpackPluginOptions {
    /**
     * Filename of the output bundle when emitting css bundle
     * supports 
     * - [contenthash] replacer - "stylable.[contenthash].css" - based on file content hash
     * - [name] replacer - "[name].css" - based on entry name - is not supported in "extractMode: 'single'" with multiple entries
     */
    filename?: string;
    /**
     * Determine the way css is injected to the document
     * js - every js module contains the css and inject it independently
     * css - emit bundled css asset to injected via link
     * mini-css - inject css modules via webpack mini-css-extract-plugin (can support dynamic splitting but order is not deterministic, requires minimum version 1.3.9)
     * none - will not generate any output css (usually good for ssr bundles)
     */
    cssInjection?: 'js' | 'css' | 'mini-css' | 'none';
    /**
     * Determine the runtime stylesheet id kind used by the cssInjection js mode
     * This sets the value of the st_id attribute on the stylesheet element
     * default for dev - 'module'
     * default for prod - 'namespace'
     */
    runtimeStylesheetId?: 'module' | 'namespace';
    /**
     * Config how error and warning reported to webpack by stylable
     * auto - Stylable warning will emit Webpack warning and Stylable error will emit Webpack error
     * strict - Stylable error and warning will emit Webpack error
     * loose - Stylable error and warning will emit Webpack warning
     */
    diagnosticsMode?: 'auto' | 'strict' | 'loose';
    /**
     * Target of the js module
     * oldie - ES3 compatible
     * modern - ES2105 compatible
     */
    target?: 'oldie' | 'modern';
    /**
     * Set the <style> tag st_id attribute to allow multiple Stylable build to be separated in the head
     * This only apply to cssInjection js mode
     */
    runtimeId?: string;
    /**
     * Optimization options
     */
    optimize?: {
        /* Removes comments from output css */
        removeComments?: boolean;
        /* Removes unused rules that target unused components */
        removeUnusedComponents?: boolean;
        /* Remove empty css rules */
        removeEmptyNodes?: boolean;
        /* Generate short classnames */
        classNameOptimizations?: boolean;
        /* Generate short namespaces */
        shortNamespaces?: boolean;
        /* Should minify css */
        minify?: boolean
    };
    /**
     * Provide custom StylableOptimizer instance
     */
    optimizer?: StylableOptimizer;
    /**
     * A function to override Stylable instance default configuration options
     */
    stylableConfig?: (config: StylableConfig, compiler: Compiler) => StylableConfig;
    /**
     * Allow to disable specific diagnostics reports
     */
    unsafeMuteDiagnostics?: {
        DUPLICATE_MODULE_NAMESPACE?: boolean | 'warn';
    };
    /**
     * Runs "stc" programmatically with the webpack compilation.
     * true - it will automatically detect the closest "stylable.config.js" file and use it.
     * string - it will use the provided string as the "stcConfig" file path.
     */
    stcConfig?: boolean | string;
    /**
     * Set the strategy of how to spit the extracted css
     * This option is only used when cssInjection is set to 'css'
     * single - extract all css to a single file
     * entries - extract file per entry which does not depend on another entry
     */
    extractMode?: 'single' | 'entries';
    /**
     * Allow filter for url asset processing.
     * Filtered asset will not be processed and remain untouched.
     */
    assetFilter?: (url: string, context: string) => boolean;
}

```

### Stylable config
`StylableWebpackPlugin` will attempt to load the nearest `stylable.config.js` file and use it as override.
Stylable config file should export `webpackPlugin` function with the following type:
```ts
type webpackPlugin = (pluginOptions: StylableWebpackPluginOptions) => StylableWebpackPluginOptions;
```

Example of a `stylable.config.js` file:
```js
module.exports.webpackPlugin = (defaultPluginOptions) => {
  return {
    ...defaultPluginOptions,
    stylableConfig(defaultStylableConfig) {
      return {
        ...defaultStylableConfig,
        // Example override the namespace generation strategy
        // resolveNamespace: (ns)=> `prefix-${ns}` 
      }
    }
    // Example to unsafely ignore duplicate namespace errors 
    // unsafeMuteDiagnostics: {
    //   DUPLICATE_MODULE_NAMESPACE: 'warn'
    // }
  }
}
```

### Default development configuration
```js
new StylableWebpackPlugin({ 
    filename: 'stylable.css',
    cssInjection: 'js',
    runtimeStylesheetId: 'module',
    diagnosticsMode: 'auto',
    optimize: {
      removeUnusedComponents: true,
      removeComments: false,
      classNameOptimizations: false,
      shortNamespaces: false,
      removeEmptyNodes: false,
      minify: false,
    }
})
```

### Default production configuration
```js
new StylableWebpackPlugin({ 
    filename: 'stylable.css',
    cssInjection: 'css',
    runtimeStylesheetId: 'namespace',
    diagnosticsMode: 'auto',
    optimize: {
      removeUnusedComponents: true,
      removeComments: true,
      classNameOptimizations: true,
      shortNamespaces: true,
      removeEmptyNodes: true,
      minify: true,
    }
})
```
> Note: the values above reflect the defaults given to each parameter, they only need to be specified if the default value needs to be changed

## Asset handling
CSS assets are handled by webpack native AssetsModules support.

## Compatibilities with existing loading mechanisms
If you're using css_loader/extract make sure to exclude `.st.css` files from the process. You cannot use loaders with Stylable `.st.css` files

## FAQ:

#### In what cases should I provide a custom Optimizer?
- You want to have different `className` and `namespace` short prefixes when you combine two projects that are not built together
- You want to override the `minify` function and use a custom minifier

#### When should I provide assetFilter?
- When your webpack compilation should not handle a specific asset. For example, in NextJS all assets are already processed for you and the URLs in the CSS are not touched.

## License
Copyright (c) 2017 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by an [MIT license](./LICENSE).
