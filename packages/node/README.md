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

See the type definition [here](./src/require-hook.ts#L6).

```ts
const {attachHook} = require('@stylable/node');
attachHook();

const { style, classes } = require('./stylesheet.st.css');
```

## attachHook Options

```ts 
interface Options {
    /* override .st.css file match */
    matcher?: (filename: string) => boolean;
    /* stylable instance configure */
    stylableConfig?: Partial<StylableConfig>;
    /* hook for after compile */
    afterCompile?: (code: string, filename: string) => string;
    /* request for the @stylable/runtime */
    runtimePath?: string;
    /* should ignore built .st.css.js files */
    ignoreJSModules?: boolean;
}
```


## License
Copyright (c) 2017 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by a [MIT license](./LICENSE).

