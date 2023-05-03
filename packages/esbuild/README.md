# @stylable/esbuild

[![npm version](https://img.shields.io/npm/v/@stylable/esbuild.svg)](https://www.npmjs.com/package/@stylable/esbuild)

`@stylable/esbuild` 

## Installation

```bash
npm install @stylable/esbuild
```

## Usage

```js
const { build } = require('esbuild');
const { stylablePlugin } = require('@stylable/esbuild');

build({
  plugins: [stylablePlugin({ /* options */})],
});

```

## Options

```ts
interface ESBuildOptions {
    /**
     * Determine the way css is injected to the document
     * js - every js module contains the css and inject it independently
     * css - emit bundled css asset to injected via link
     */
    cssInjection?: 'js' | 'css';
    /**
     * Config how error and warning reported to esbuild by stylable
     * auto - Stylable warning will emit esbuild warning and Stylable error will emit esbuild error
     * strict - Stylable error and warning will emit esbuild error
     * loose - Stylable error and warning will emit esbuild warning
     */
    diagnosticsMode?: DiagnosticsMode;
    /**
     * A function to override Stylable instance default configuration options
     */
    stylableConfig?: (config: StylableConfig, build: PluginBuild) => StylableConfig;
    /**
     * Use to load stylable config file.
     * true - it will automatically detect the closest "stylable.config.js" file and use it.
     * false - will not load any "stylable.config.js" file.
     * string - will use the provided string as the "configFile" file path.
     */
    configFile?: boolean | string;
    /**
     * Stylable build mode
     */
    mode?: 'production' | 'development';
    /**
     * Determine the runtime stylesheet id kind used by the cssInjection js mode
     * This sets the value of the st_id attribute on the stylesheet element
     * default for dev - 'module+namespace'
     * default for prod - 'namespace'
     */
    runtimeStylesheetId?: 'module' | 'namespace' | 'module+namespace';
    /**
     * Optimization options
     */
    optimize?: {
        removeUnusedComponents?: boolean;
    };
}
```


## License
Copyright (c) 2017 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by an [BSD license](./LICENSE).
