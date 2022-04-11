// @ts-check
const { StylableWebpackPlugin } = require('@stylable/webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

/** @type {import('webpack').Configuration} */
module.exports = {
    mode: 'development',
    context: __dirname,
    devtool: 'source-map',
    output: {
        library: 'Library',
        libraryTarget: 'umd',
    },
    plugins: [new StylableWebpackPlugin(), new HtmlWebpackPlugin()],
};
