const { StylableWebpackPlugin } = require('@stylable/webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

/** @type {import('webpack').Configuration} */
module.exports = {
    mode: 'development',
    entry: {
        entryA: './src/index-a.js',
        entryB: './src/index-b.js',
    },
    // mode: 'production',
    context: __dirname,
    devtool: 'source-map',
    plugins: [new StylableWebpackPlugin(), new HtmlWebpackPlugin()],
    optimization: {
        splitChunks: {
            chunks: 'all',
            maxInitialRequests: 1,
        },
    },
};
