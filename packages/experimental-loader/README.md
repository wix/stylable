# Experimental Stylable Webpack Loader

This loader designed to work with webpack `mini-css-extract-plugin`. And actually contains two loaders, one for the transformation and the other for the stylable runtime.

minimal webpack configuration with the loaders:

```js
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { stylableLoaders } = require('@stylable/experimental-loader');

module.exports = {
    plugins: [new MiniCssExtractPlugin()],
    module: {
        rules: [
            // load asset from css url()
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

## Disclaimer

This loader is not the recommended way to load stylable files. Use `@stylable/webpack-plugin` for the best integration.

This loader dose not cover:

-   Stylable specific optimizations.
-   Can have issues with css loading order (only order by css js imports)
-   Can have issues with update css when js import order changes (mini-css-extract-plugin issues)
