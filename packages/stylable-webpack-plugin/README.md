# Stylable Webpack Plugin

The Stylable Webpack Plugin (for Webpack version 4x) is the main build utility for [Stylable](https://stylable.io/). It supports both development and production modes, providing various configurations that can be tweaked according to your specific needs. It enables loading Stylable files (`.st.css`) from local projects or imported from a 3rd party source (for example, NPM node modules).

## Getting started
Install `stylable-webpack-plugin` as a dev dependency in your local project.

Install using npm:
```bash
npm install stylable-webpack-plugin --save-dev
```

Install using yarn:
```bash
yarn add stylable-webpack-plugin --dev
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
| Option	| Type	| Default	| Description |
|---------|:-----:|:--------:|--------------|
|outputCSS | boolean |	false	| Generate CSS asset files per bundle |
|filename	| string | [name].bundle.css	| The name of the CSS bundle file when outputCSS is enabled |
|includeCSSInJS |	boolean	| true |	Include target CSS in the JavaScript modules (used by runtime renderer) |
| createRuntimeChunk | boolean | false | Move **all** Stylable modules into a separate chunk with a runtime renderer |
| rootScope | boolean | true | Enable automatically scoping the root component |
| bootstrap.autoInit | boolean | true | Initialize the rendering of the CSS in the browser |
| optimize.removeUnusedComponents | boolean | true | Remove selectors that contain namespaces (classes) that are not imported by JavaScript |
| optimize.removeComments | boolean | false | Remove CSS comments from the target |
| optimize.removeStylableDirectives | boolean | true | Remove all `-st-*` from target (currently also removes empty rules which will be a separate option coming soon)  |
| optimize.classNameOptimizations | boolean | false | Shorten all class names and replace them in the JavaScript modules |
| optimize.shortNamespaces | boolean | false | Shorten all namespaces which affects the resulting `data-*` selectors and DOM attributes |

> **Note:**
> The plugin defaults into development mode. For a production build, you must use a manual configuration, according to your specific requirements.

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
      shortNamespaces: true
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

## How it works (in case you're wondering)
The plugin transforms all Stylable files into JavaScript modules with CSS rendering capabilities. 

Every bundle that contains Stylable modules is injected with a `stylable-bootstrap-module` as its entrypoint. This module is responsible for: 
* Ensuring that all of the transformed modules are imported in the proper order. 
* Initializing the runtime DOM renderer. 

The resulting renderer orders the CSS by the depth of each module, calculated from its dependencies and component dependencies. 

**Stylable bootstrap module** The `stylable-bootstrap-module` is a generated module injected into the bundle as its entrypoint and ensures all Stylable modules are injected into the runtime renderer.

**Runtime DOM renderer** The core Stylable runtime renderer in the browser is responsible for rendering stylesheets in the correct order in the DOM.
