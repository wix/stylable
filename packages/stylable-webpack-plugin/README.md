# Stylable webpack plugin
The Stylable webpack plugin (for webpack v4) is the main build utility for **[Stylable](https://stylable.io)**. It supports both development and production modes providing various configurations that can be tweaked according to your specific needs. 
It enables loading of Stylable files (`.st.css`) from your local projects or imported from a 3rd party source (for example, NPM node modules).

The plugin works by transforming all Stylable files into JavaScript modules with CSS rendering capabilities.
In practice, every bundle will have a `stylable-bootstrap-module` entrypoint that is responsible for loading all of the transformed modules and rendering them onto the DOM. It orders the CSS, keeping track of the depth of each module by resolving their dependencies and component dependencies. This allows us to load dynamic stylable modules with overrides and render them in the correct order.

## Stylable bootstrap module
The `stylable-bootstrap-module` is a generated module injected to the bundle entry that ensures all Stylable modules are injected into the runtime renderer. 

### Runtime renderer
The core Stylable runtime renderer in the browser is responsible for rendering stylesheets in the correct order in the DOM.

## Getting started

Install `stylable-webpack-plugin` as a dev dependency in your local project.

Install using `npm`:

```bash
npm install stylable-webpack-plugin --save-dev
```

Or install using `yarn`:

```bash
yarn add stylable-webpack-plugin --dev
```

## Sample dev config
```js
// webpack.config.js
module.exports = {
  …
  plugins: [new StylableWebpackPlugin()]
  …
};
```

## Plugin Options
|  option | type   | default   | description   |
|---------|:-----:|:--------:|--------------|
| outputCSS | boolean | false | Generate CSS asset files per bundle |
| filename | string | [name].bundle.css | The name of the CSS bundle file when outputCSS is enabled |
| includeCSSInJS | boolean | true | include target CSS in the JavaScript modules (used by runtime renderer) |
| createRuntimeChunk | boolean | false | Move **all** Stylable modules into a separate chunk with a runtime renderer |
| rootScope | boolean | true | Enables automatic component root scoping |
| bootstrap.autoInit | boolean | true | Initialize the rendering of the CSS in the browser |
| optimize.removeUnusedComponents | boolean | true | Removes selectors that contain namespaces (classes) that are not imported by JavaScript |
| optimize.removeComments | boolean | false | Removes CSS comments from target |
| optimize.removeStylableDirectives | boolean | true | Removes all `-st-*` from target*  |
| optimize.classNameOptimizations | boolean | false | Shortened all class names and replaces them in the JavaScript modules |
| optimize.shortNamespaces | boolean | false | Shorten all namespaces, this affects the resulting `data-*` selectors and DOM attributes |
  
> * This currently is also responsible for removing empty rules, we plan exposing it seperately.

## Production configuration
The plugin defaults into development mode. For a production build a manual configuration is needed, according to your specific requirements.

### Sample production config
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
CSS assets are handled by `url-loader` + `file-loader` combination.

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
1. If you're using `css_loader`/`extract` make sure to exclude `.st.css` files from the process
2. You cannot use loaders with Stylable `.st.css` files
