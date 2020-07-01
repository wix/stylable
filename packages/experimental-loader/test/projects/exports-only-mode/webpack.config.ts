import HTMLWebpackPlugin from 'html-webpack-plugin';
import { stylableLoaders } from '../../../src';
import { noCollisionNamespace } from '@stylable/core';

module.exports = {
    mode: 'development',
    entry: './index.js',
    context: __dirname,
    devtool: false,
    plugins: [new HTMLWebpackPlugin()],
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
