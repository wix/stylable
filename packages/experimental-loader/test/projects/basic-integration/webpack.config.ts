import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { stylableLoaders } from '../../../src';
import { noCollisionNamespace } from '@stylable/core';

export default {
    mode: 'development',
    entry: './index.js',
    context: __dirname,
    devtool: false,
    output: { publicPath: '' },
    plugins: [new MiniCssExtractPlugin(), new HtmlWebpackPlugin()],
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
