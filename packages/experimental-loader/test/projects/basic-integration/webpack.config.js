const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { noCollisionNamespace } = require('@stylable/core');
const { stylableLoaders } = require('@stylable/experimental-loader');
const { TestManifestPlugin } = require('../../../dist/test/testkit/manifest-plugin');

/** @type {import('webpack').Configuration} */
module.exports = {
    mode: 'development',
    entry: './index.js',
    context: __dirname,
    devtool: false,
    plugins: [new TestManifestPlugin(), new MiniCssExtractPlugin(), new HtmlWebpackPlugin()],
    module: {
        rules: [
            {
                test: /\.(svg|png|jpg|jpeg|gif|ttf)/,
                type: 'asset/resource',
            },
            {
                test: /\.st\.css$/i,
                use: [
                    stylableLoaders.runtime(),
                    MiniCssExtractPlugin.loader,
                    stylableLoaders.transform({
                        resolveNamespace: noCollisionNamespace(),
                    }),
                ],
            },
        ],
    },
};
