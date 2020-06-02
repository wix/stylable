# Experimental Stylable Webpack Loader

This loader is designed to work with the webpack `mini-css-extract-plugin`. This setup actually uses two loaders internally.

`stylable-transform-loader` - responsible for the stylable transform and generate `css-loader` compatible output that the `mini-css-extract-plugin` can also digest.

`stylable-runtime-loader` - because stylable has richer module api then css modules and `css-loader` loader flow dose not support it. we are using this loader to warp the raw stylable locals data with the runtime stylesheet.



Minimal webpack configuration with the loaders:

```js
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { stylableLoaders } = require('@stylable/experimental-loader');

module.exports = {
    plugins: [new MiniCssExtractPlugin()],
    module: {
        rules: [
            // load asset from CSS url()
            {
                test: /\.(png|jpg|gif)$/i,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            limit: 8192,
                        },
                    },
                ],
            },
            {
                test: /\.st\.css$/i,
                use: [
                    stylableLoaders.runtime(),
                    {
                        loader: MiniCssExtractPlugin.loader,
                        options: { reloadAll: true },
                    },
                    stylableLoaders.transform(),
                ],
            },
        ],
    },
};
```

### Loader Options

```ts
interface LoaderOptions {
    resolveNamespace?(namespace: string, filePath: string): string;
    filterUrls?(url: string, ctx: loader.LoaderContext): boolean;
}
```

|Option|Description|
|------|-----------|
|`resolveNamespace`|override default stylesheet namespace process|
|`filterUrls`|filter urls from webpack process|


## Disclaimer

This loader is experimental and is not the recommended way of integrating Stylable into your project. Use `@stylable/webpack-plugin` for the latest stable integration.


## Known issues

This loader:

-   Does not perform Stylable specific optimizations
-   Can have issues with CSS loading order (order being determined by JS imports)
-   Can have issues with updating CSS when JS imports change order (existing mini-css-extract-plugin issue)
