const { StylableWebpackPlugin } = require('@stylable/webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

/** @type {import('webpack').Configuration} */
module.exports = {
    mode: 'development',
    context: __dirname,
    devtool: 'source-map',
    plugins: [
        new StylableWebpackPlugin({
            diagnosticsMode: 'strict', // to make sure that every diagnostic which is not "info" will be fatal.
        }),
        new HtmlWebpackPlugin(),
    ],
};
