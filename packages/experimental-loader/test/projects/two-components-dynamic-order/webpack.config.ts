import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { stylableLoaders } from '../../../src';
import { noCollisionNamespace } from '@stylable/core';

export default {
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
                    {
                        loader: MiniCssExtractPlugin.loader,
                        options: { esModule: true, reloadAll: true },
                    },
                    stylableLoaders.transform({
                        resolveNamespace: noCollisionNamespace(),
                    }),
                ],
            },
        ],
    },
};
