const { StylableWebpackPlugin } = require('@stylable/webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

/** @type {import('webpack').Configuration} */
module.exports = {
    mode: 'development',
    context: __dirname,
    devtool: 'source-map',
    plugins: [
        new StylableWebpackPlugin({
            optimize: {
                // don't trim custom properties
                minify: false,
            },
            stylableConfig(config) {
                return {
                    ...config,
                    // keep namespace with no hash for test expectations
                    resolveNamespace(namespace) {
                        return namespace;
                    },
                };
            },
        }),
        new HtmlWebpackPlugin(),
    ],
};
