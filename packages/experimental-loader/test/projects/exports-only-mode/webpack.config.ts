import HtmlWebpackPlugin from 'html-webpack-plugin';
import { stylableLoaders } from '../../../src';
import { noCollisionNamespace } from '@stylable/core';

export default {
    mode: 'development',
    entry: './index.js',
    context: __dirname,
    devtool: false,
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
