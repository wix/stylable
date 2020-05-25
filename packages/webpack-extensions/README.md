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

## stylable-metadata-loader

Generate structure for imported stylesheet that contains the depended st.css files mapped by content hash. also remap imports to use the files content hash. This structure is used to create in memory file system for stylable to transpile overrides separated from the main build process.

loader options:
```ts
interface LoaderOptions {
    exposeNamespaceMapping: boolean;
    resolveNamespace(namespace: string, filePath: string): string;
}
```
Things to note:

1. JS imports are not supported yet.
2. namespaces will be different if not taken into account in the in memory transpilation(*)

* use exposeNamespaceMapping to expose namespaces from the metadata build

## Contributing

Read our [contributing guidelines](../../CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests.

## License
Copyright (c) 2017 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by an [BSD license](./LICENSE).



