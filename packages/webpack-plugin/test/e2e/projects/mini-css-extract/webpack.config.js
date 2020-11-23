const { StylableWebpackPlugin } = require('@stylable/webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCSS = require('mini-css-extract-plugin');

module.exports = {
    mode: 'development',
    context: __dirname,
    devtool: 'source-map',
    plugins: [
        new StylableWebpackPlugin({ cssInjection: 'mini-css' }),
        new MiniCSS(),
        new HtmlWebpackPlugin(),
    ],
};
