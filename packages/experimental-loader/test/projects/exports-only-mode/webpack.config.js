const HtmlWebpackPlugin = require('html-webpack-plugin');
const { noCollisionNamespace } = require('@stylable/core');
const { stylableLoaders } = require('@stylable/experimental-loader');

/** @type {import('webpack').Configuration} */
module.exports = {
    mode: 'development',
    entry: './index.js',
    context: __dirname,
    devtool: false,
    output: { publicPath: '' },
    plugins: [new HtmlWebpackPlugin()],
    module: {
        rules: [
            {
                test: /\.st\.css$/i,
                use: [
                    stylableLoaders.transform({
                        resolveNamespace: noCollisionNamespace(),
                        exportsOnly: true,
                    }),
                ],
            },
        ],
    },
};
