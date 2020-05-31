# @stylable/webpack-extension

[![npm version](https://img.shields.io/npm/v/@stylable/webpack-extensions.svg)](https://www.npmjs.com/package/@stylable/webpack-extensions)

`@stylable/webpack-extensions` contains experimental Stylable webpack plugins for various use cases.

## Installation

```sh
yarn add --dev @stylable/webpack-extensions
```

## `remove-unused-css-modules`

Remove all css modules that are not being used by any javascript file.

## `stylable-metadata-plugin`

Generate component metadata for tooling.

## `stylable-forcestates-plugin`

Generate css that allow to force css state on dom node.

## `stylable-metadata-loader`

Use this loader to generates a mapping of imported stylesheets that contains imported `.st.css` files (dependencies) mapped by a hash of their content. It also remaps any imports within the content to use the files content hash as the imported filepath. 

This structure is used to create an in-memory file system representation for Stylable to transpile overrides apart from the main build process.

### Loader options
```ts
interface LoaderOptions {
  exposeNamespaceMapping: boolean;
  resolveNamespace(namespace: string, filePath: string): string;
}
```

### Notes 
1. JS imports are currently not supported (mixins and formatters)
2. Namespaces can be different if not taken into account during the in memory transpilation (for path based namespace resolvers)

> Use `exposeNamespaceMapping` to expose original namespaces from the metadata build

#### Example output
```js
{
    entry: "<entry_hash>",
    stylesheetMapping: {
        "/<entry_hash>.st.css": ":import { -st-from: '/<imported_hash>.st.css' } <rest_of_entry_content>",
        "/<imported_hash>.st.css": "<imported_content>"
    },
    namespaceMapping: {
        "/<entry_hash>.st.css": "<entry_namespace>",
        "/<imported_hash>.st.css": "<imported_namespace>"
    }
}
```


#### Usage in webpack
The config below shows an inline loader alias configuration, any other webpack config (using `module.rules`) can also be used.


```ts
// webpack.config.js
import { metadataLoaderLocation } from "@stylable/webpack-extensions"

const webpackConfig = {
    ...
    resolveLoader: {
        alias: { 'stylable-metadata': metadataLoaderLocation },
    }
    ...
}
```

#### Metadata consumption usage
To use this loader, import the stylesheet using the previously configured loader.
```ts
import metadata from "stylable-metadata!./path-to-stylesheet.st.css";
```

> Note: when using an inline loader configuration it is possible to configure the loader via the `stylable.config.js` configuration file
```ts
// stylable.config.js
module.exports.metadataLoader = {
    exposeNamespaceMapping: true    
}
```

#### Typescript types
The definition for typings for this loader depends on the loader configuration used, but you can declare modules with one of the following loader interfaces:

```ts
// globals.d.ts

// when exposing namespaceMapping
declare module 'stylable-metadata?exposeNamespaceMapping=true!*.st.css' {
    const stylesheetMetadata: {
        entry: string;
        stylesheetMapping: Record<string, string>;
        namespaceMapping: Record<string, string>;
    };
    export = stylesheetMetadata;
}

// when not exposing namespaceMapping
declare module 'stylable-metadata!*.st.css' {
    const stylesheetMetadata: {
        entry: string;
        stylesheetMapping: Record<string, string>;
    };
    export = stylesheetMetadata;
}
```

## Contributing

Read our [contributing guidelines](../../CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests.

## License

Copyright (c) 2017 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by an [BSD license](./LICENSE).
