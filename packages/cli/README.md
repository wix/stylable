# @stylable/cli

[![npm version](https://img.shields.io/npm/v/@stylable/cli.svg)](https://www.npmjs.com/package/@stylable/cli)

`@stylable/cli` is a low-level utility used for working with Stylable projects directly.

- Build and transform stylesheets into JavaScript modules
- Generate an entry index file to help consume a published project

## Installation
This package is currently a work-in-progress and is set to `private`. Once it matures, it will be published externally to NPM.

## Usage

After installing `@stylable/cli`, a new `stc` command will be available, running `stc --help` will provide a brief description for the options available.

|Option|Description|Default Value|
|------|-----------|-------------|
|version|show CLI version number|`boolean`|
|rootDir|root directory of project|`cwd`|
|srcDir|source directory relative to root|`./`|
|outDir|target directory relative to root|`./`|
|indexFile|filename of the generated index|`false`|
|cjs|output commonjs modules (`.js`)|`true`|
|esm|output esm modules (`.mjs`)|`false`|
|css|output transpiled css files (`.css`)|`false`|
|stcss|output stylable source files (`.st.css`)|`false`|
|customGenerator|path of a custom index file generator|-|
|ext|extension of stylable css files|`.st.css`|
|log|verbose log|`false`|
|diagnostics|verbose diagnostics|`false`|
|help|Show help|`boolean`|

### Generate an index file
This generates an `index.st.css` file that acts as an export entry from every stylesheet in the provided `srcDir`.

```sh
$ stc --srcDir="./src" --outDir="./dist" --indexFile="index.st.css"
```

### Build source stylesheets to JavaScript modules
To transform your project stylesheets to target JavaScript modules containing the transformed source files, you must provide the `indexFile` paramter with an empty string.

```sh
$ stc --srcDir="./src" --outDir="./dist"
```

## License

Copyright (c) 2017 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by a [BSD license](./LICENSE).
