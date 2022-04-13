const { StylableWebpackPlugin } = require('@stylable/webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { join } = require('path');

/** @type {import('webpack').Configuration} */
module.exports = {
    mode: 'development',
    context: __dirname,
    devtool: 'source-map',
    output: {
        path: join(__dirname, 'dist2'),
    },
    plugins: [
        new StylableWebpackPlugin({
            cssInjection: 'css',
            optimize: {
                dedupeSimilarStylesheets: true
            },
        }),
        new HtmlWebpackPlugin(),
    ],
};
