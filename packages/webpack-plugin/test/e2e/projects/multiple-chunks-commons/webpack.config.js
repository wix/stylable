const { StylableWebpackPlugin } = require('@stylable/webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

/** @type {import('webpack').Configuration} */
module.exports = {
    mode: 'development',
    entry: {
        a: './src/a',
        b: './src/b',
    },
    context: __dirname,
    devtool: 'source-map',
    plugins: [new StylableWebpackPlugin({ cssInjection: 'css' }), new HtmlWebpackPlugin()],
};
