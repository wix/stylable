import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { stylableLoaders } from '../../../src';
import { noCollisionNamespace } from '@stylable/core';
import { TestManifestPlugin } from '../../test-kit/manifest-plugin';

export default {
    mode: 'development',
    entry: './index.js',
    context: __dirname,
    devtool: false,
    plugins: [new TestManifestPlugin(), new MiniCssExtractPlugin(), new HtmlWebpackPlugin()],
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
