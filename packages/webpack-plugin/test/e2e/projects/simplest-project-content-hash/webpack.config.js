const { StylableWebpackPlugin } = require('@stylable/webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    mode: 'development',
    context: __dirname,
    devtool: 'source-map',
    plugins: [new StylableWebpackPlugin({
        outputCSS: true, // enable emit css in dev mode
        filename: 'output.[contenthash:5].css'
    }), new HtmlWebpackPlugin()],
};
