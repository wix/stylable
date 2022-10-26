
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

> ### If you use any other rollup CSS plugins you should exclude Stylable files (`*.st.css`) from them.


### Plugin Options

```ts
interface StylableRollupPluginOptions {
    minify?: boolean;
    inlineAssets?: boolean;
    fileName?: string;
    diagnosticsMode?: 'auto' | 'strict' | 'loose';
    /**
     * A function to override Stylable instance default configuration options
     */
    stylableConfig?: (config: StylableConfig) => StylableConfig;
    /**
     * Runs "stc" programmatically with the webpack compilation.
     * true - it will automatically detect the closest "stylable.config.js" file and use it.
     * string - it will use the provided string as the "stcConfig" file path.
     */
    stcConfig?: string | boolean;
}
```

> This package provides **naive** Stylable rollup plugin. It is in early development stages and may not behave expectedly in all cases. Please open a PR/issue if you encounter any problems.

## License
Copyright (c) 2021 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by an [MIT license](./LICENSE).
