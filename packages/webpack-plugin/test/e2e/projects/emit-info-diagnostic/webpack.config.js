const { StylableWebpackPlugin } = require('@stylable/webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

/** @type {import('webpack').Configuration} */
module.exports = {
    mode: 'development',
    context: __dirname,
    devtool: 'source-map',
    plugins: [
        new StylableWebpackPlugin({
            diagnosticsMode: 'strict',
            stylableConfig: (config) => ({
                ...config,
                hooks: {
                    postProcessor: (result) => {
                        result.meta.diagnostics.info(result.meta.ast.root(), 'test info warning!');
                        return result;
                    },
                },
            }),
        }),
        new HtmlWebpackPlugin(),
    ],
};
