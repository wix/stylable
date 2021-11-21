# @stylable/core

[![npm version](https://img.shields.io/npm/v/@stylable/core.svg)](https://www.npmjs.com/package/stylable/core)

`@stylable/core` is at the center of how Stylable operates. It provides the basic capabilities required for Stylable to parse stylesheets and transform their output to valid plain CSS.

## Running Stylable

Follow these instructions in order to run Stylable in development mode, this allows you to run the package tests with hot-loading enabled.

1. Clone this repo
2. `cd stylable`
3. `npm i`
4. `cd ./packages/stylable`
5. `npm start`
6. Open your browser to [`http://localhost:8080/tests.bundle`](http://localhost:8080/tests.bundle)

## How it works

Stylable's workflow contains two main parts that together perform the CSS transpilation.

- `stylable-processor` - Parses each `stylesheet` separately into its own AST ([abstract syntax tree](https://en.wikipedia.org/wiki/Abstract_syntax_tree), extracting the required data without any resolution of dependencies in other files.
- `stylable-transformer` - Processes each stylesheet using the previously created data including other file dependencies. Transforms our Stylable CSS into vanilla CSS.

## License

Copyright (c) 2017 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by a [MIT license](./LICENSE).
