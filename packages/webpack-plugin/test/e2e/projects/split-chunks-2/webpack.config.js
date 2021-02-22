const { StylableWebpackPlugin } = require('@stylable/webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

/** @type {import('webpack').Configuration} */
module.exports = {
    mode: 'development',
    context: __dirname,
    devtool: 'source-map',
    plugins: [new StylableWebpackPlugin(), new HtmlWebpackPlugin()],
    optimization: {
        splitChunks: {
            minSize: 0,
            chunks: 'all',
            name: false,
        },
        runtimeChunk: {
            name: 'test-runtime',
        },
    },
};
