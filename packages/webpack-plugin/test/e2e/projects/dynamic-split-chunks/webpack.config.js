const { StylableWebpackPlugin } = require('@stylable/webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    mode: 'development',
    context: __dirname,
    devtool: 'source-map',
    plugins: [
        new StylableWebpackPlugin({
            useEntryModuleInjection: true,
            outputCSS: true,
            includeCSSInJS: false
        }),
        new HtmlWebpackPlugin(),
    ],
};
