
# @stylable/rollup-plugin

[![npm version](https://img.shields.io/npm/v/@stylable/rollup-plugin.svg)](https://www.npmjs.com/package/@stylable/rollup-plugin)

### Installation

`npm i @stylable/rollup-plugin -D`

or 

`yarn add @stylable/rollup-plugin --dev`

### Usage

```js
// rollup.config.js
import stylable from "@stylable/rollup-plugin";

export default {
    ...
    plugins: [ stylable() ]
}

```

> If you use any other CSS plugin you should exclude Stylable files (`*.st.css`) from them.


### Plugin Options

```ts
interface StylableRollupPluginOptions {
    minify?: boolean;
    inlineAssets?: boolean;
    fileName?: string;
    diagnosticsMode?: DiagnosticsMode;
    resolveNamespace?: (namespace: string, source: string) => string;
}
```

> This package provides **naive** Stylable rollup plugin. It is in early development stages and may not behave expectedly in all cases. Please open a PR/issue if you encounter any problems.

## License
Copyright (c) 2021 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by an [BSD license](./LICENSE).
