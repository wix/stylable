[![Stylable CSS for Components](./stylable.svg)](https://stylable.io)

[![npm version](https://img.shields.io/npm/v/stylable.svg)](https://www.npmjs.com/package/stylable)
[![Build Status](https://travis-ci.org/wix/stylable.svg?branch=master)](https://travis-ci.org/wix/stylable)

## Running Stylable
Follow these instructions in order to run Stylable in development mode, this allows you to run the package tests with hot-loading enabled.
1. Clone this repo
2. `cd stylable`
3. `yarn`
4. `yarn build`
5. `cd ./packages/stylable`
6. `yarn start`
7. Open your browser to [`http://localhost:8080/tests.bundle`](http://localhost:8080/tests.bundle)

## How it works
Stylable's workflow contains two main parts that together perform the CSS transpilation.

- `stylable-processor` - Parses each `stylesheet` separately into its own AST ([abstract syntax tree](https://en.wikipedia.org/wiki/Abstract_syntax_tree), extracting the required data without any resolution of dependencies in other files.
- `stylable-transformer` - Processes each stylesheeet using the previously created data including other file dependencies. Transforms our Stylable CSS into vanilla CSS.

## License

Copyright (c) 2017 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by a [BSD license](./LICENSE).
