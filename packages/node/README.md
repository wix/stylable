# @stylable/node

[![npm version](https://img.shields.io/npm/v/@stylable/node.svg)](https://www.npmjs.com/package/@stylable/node)

`@stylable/node` is a simple integration that allows integrating Stylable into your node application. The most common use-case is server-side rendering.

## Installation

```sh
yarn add --dev @stylable/node
```
## Usage
Import the `attachHook` utility from `@stylable/node`, and invoke it.
The `attachHook` can receive optional arguments in the form of a `config` object. 

See the type definition [here](https://github.com/wix/stylable/blob/master/packages/node/src/require-hook.ts#L5).

```ts
const {attachHook} = require('@stylable/node');
attachHook();

const style = require('./stylesheet.st.css');
```
## License

Copyright (c) 2017 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by a [BSD license](./LICENSE).

