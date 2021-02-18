# @stylable/webpack-plugin

[![npm version](https://img.shields.io/npm/v/@stylable/webpack-plugin.svg)](https://www.npmjs.com/package/@stylable/webpack-plugin)

`@stylable/webpack-plugin` (for webpack `^5.20.0`) is the main build utility for [Stylable](https://stylable.io/). It supports both development and production modes, providing various configurations that can be tweaked according to your specific needs. It enables loading Stylable files (`.st.css`) from local projects or imported from a 3rd party source (for example, NPM node modules).

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
     * Only supports [contenthash] replacer - "stylable.[contenthash].css"
     */
    filename?: string;
    /**
     * Determine the way css is injected to the document
     * js - every js module contains the css and inject it independently
     * css - emit bundled css asset to injected via link
     * mini-css - inject css modules via webpack mini-css-extract-plugin (can support dynamic splitting but order is not deterministic)
     * none - will not generate any output css (usually good for ssr bundles)
     */
    cssInjection?: 'js' | 'css' | 'mini-css' | 'none';
    /**
     * Determine the runtime stylesheet id kind used by the cssInjection js mode
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
     * Set the <style> tag st-id attribute to allow multiple Stylable build to be separated in the head
     * This only apply to cssInjection js mode
     */
    runtimeId?: string;
    /**
     * Optimization options
     */
    optimize?: {
        /* Removes comments from output css */
        removeComments?: boolean;
        /* Removes all Stylable directives like -st-extends */
        removeStylableDirectives?: boolean;
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
        DUPLICATE_MODULE_NAMESPACE?: boolean;
    };
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
      removeStylableDirectives: true,
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
      removeStylableDirectives: true,
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

## License
Copyright (c) 2017 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by an [BSD license](./LICENSE).
