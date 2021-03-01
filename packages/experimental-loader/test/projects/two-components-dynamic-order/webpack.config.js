const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { noCollisionNamespace } = require('@stylable/core');
const { stylableLoaders } = require('@stylable/experimental-loader');

/** @type {import('webpack').Configuration} */
module.exports = {
    mode: 'development',
    entry: './app.js',
    context: __dirname,
    devtool: false,
    plugins: [new MiniCssExtractPlugin(), new HtmlWebpackPlugin()],
    module: {
        rules: [
            {
                test: /\.(png|jpg|gif)$/i,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            limit: 8192,
                        },
                    },
                ],
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
