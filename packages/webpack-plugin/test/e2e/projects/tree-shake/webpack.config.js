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
                classNameOptimizations: false,
                shortNamespaces: false,
                removeEmptyNodes: true,
                minify: true,
            },
            stylableConfig(config) {
                return {
                    ...config,
                    resolveNamespace(namespace) {
                        return namespace;
                    },
                };
            },
        }),
        new HtmlWebpackPlugin(),
    ],
};
