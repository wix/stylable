# @stylable/webpack-plugin

[![npm version](https://img.shields.io/npm/v/@stylable/webpack-plugin.svg)](https://www.npmjs.com/package/@stylable/webpack-plugin)

`@stylable/webpack-plugin` (for webpack `v4.x`) is the main build utility for [Stylable](https://stylable.io/). It supports both development and production modes, providing various configurations that can be tweaked according to your specific needs. It enables loading Stylable files (`.st.css`) from local projects or imported from a 3rd party source (for example, NPM node modules).

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
Below you can see the various possible configuration parameters and their default values.

| Option	| Type	| Development Mode Default | Production Mode Default | Description |
|---------|:-----:|:-----------------:|:----------------:|------------|
|outputCSS | boolean |	false	| true | Generate CSS asset files per bundle |
|filename	| string | -	| [name].bundle.css | The name of the CSS bundle file when outputCSS is enabled |
|includeCSSInJS |	boolean	| true | false | Include target CSS in the JavaScript modules (used by runtime renderer) |
| createRuntimeChunk | boolean | false | false | Move **all** Stylable modules into a separate chunk with a runtime renderer |
| bootstrap.autoInit | boolean | true | true | Initialize the rendering of the CSS in the browser |
| optimize.removeUnusedComponents | boolean | true | true | Remove selectors that contain namespaces (classes) that are not imported by JavaScript |
| optimize.removeComments | boolean | false | true | Remove CSS comments from the target |
| optimize.removeStylableDirectives | boolean | true | true | Remove all `-st-*` from target (currently also removes empty rules which will be a separate option coming soon) |
| optimize.classNameOptimizations | boolean | false | true | Shorten all class names and replace them in the JavaScript modules |
| optimize.shortNamespaces | boolean | false | true | Shorten all namespaces which affects the resulting `data-*` selectors and DOM attributes |
| optimize.minify | boolean | false | true | Minify each css asset. |

### Sample production configuration
```js
new StylableWebpackPlugin({ 
    outputCSS: true, 
    includeCSSInJS: false,
    optimize: {
      removeUnusedComponents: true,
      removeComments: true,
      removeStylableDirectives: true,
      classNameOptimizations: true,
      shortNamespaces: true,
      minify: true
    }
})
```
## Asset handling
CSS assets are handled by a url-loader + file-loader combination.
```js
 module: {
    rules: [
      {
        test: /\.(png|jpg|gif)$/,
        use: [
          {
            loader: "url-loader",
            options: {
              limit: 8192
            }
          }
        ]
      }
    ]
  }
```
## Compatibilities with existing loading mechanisms
If you're using css_loader/extract make sure to exclude `.st.css` files from the process. You cannot use loaders with Stylable `.st.css` files

## How it works
The plugin transforms all Stylable files into JavaScript modules with CSS rendering capabilities. 

Every bundle that contains Stylable modules is injected with a `stylable-bootstrap-module` as its entrypoint. This module is responsible for: 
* Ensuring that all of the transformed modules are imported in the proper order. 
* Initializing the runtime DOM renderer. 

The resulting renderer orders the CSS by the depth of each module, calculated from its dependencies and component dependencies. 

**Stylable bootstrap module** The `stylable-bootstrap-module` is a generated module injected into the bundle as its entrypoint and ensures all Stylable modules are injected into the runtime renderer.

**Runtime DOM renderer** The core Stylable runtime renderer in the browser is responsible for rendering stylesheets in the correct order in the DOM.

## License

Copyright (c) 2017 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by an [BSD license](./LICENSE).
