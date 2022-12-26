const { StylableWebpackPlugin } = require('@stylable/webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

/** @type {import('webpack').Configuration} */
module.exports = {
    mode: 'production',
    context: __dirname,
    devtool: 'source-map',
    plugins: [
        new StylableWebpackPlugin({
            optimize: {
                removeUnusedComponents: true,
                removeComments: true,
                classNameOptimizations: true,
                shortNamespaces: true,
                removeEmptyNodes: true,
                minify: true,
            },
        }),
        new HtmlWebpackPlugin(),
    ],
};
