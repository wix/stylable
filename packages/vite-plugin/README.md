
# @stylable/vite-plugin

[![npm version](https://img.shields.io/npm/v/@stylable/vite-plugin.svg)](https://www.npmjs.com/package/@stylable/vite-plugin)

### Installation

`npm i @stylable/vite-plugin -D`

or 

`yarn add @stylable/vite-plugin --dev`

### Example Usage
```js
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStylable } from '@stylable/vite';

export default defineConfig({
    plugins: [react(), viteStylable({})],
});


```
> If you use any other vite CSS plugins you should exclude Stylable files (`*.st.css`) from them.


### Plugin Options

```ts
export interface StylableVitePluginOptions {
    optimization?: {
        minify?: boolean;
    };
    inlineAssets?: boolean | ((filepath: string, buffer: Buffer) => boolean);
    fileName?: string;
    mode?: 'development' | 'production';
    diagnosticsMode?: DiagnosticsMode;
    resolveNamespace?: typeof resolveNamespaceNode;
    /**
     * Runs "stc" programmatically with the webpack compilation.
     * true - it will automatically detect the closest "stylable.config.js" file and use it.
     * string - it will use the provided string as the "stcConfig" file path.
     */
    stcConfig?: boolean | string;
    projectRoot?: string;
}
```

> This package provides a **naive** Stylable vite plugin. It is in early development stages and may not behave expectedly in all cases. Please open a PR/issue if you encounter any problems.

## License
Copyright (c) 2024 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by an [MIT license](./LICENSE).
