import { stylableLoaders } from '../../../src';

export default {
    mode: 'development',
    entry: './index.js',
    context: __dirname,
    devtool: false,
    output: { publicPath: '' }, // MiniCSSExtractPlugin does not support auto publicPath
    module: {
        rules: [
            {
                test: /\.st\.css$/i,
                use: [
                    stylableLoaders.transform({
                        exportsOnly: true,
                    }),
                ],
            },
        ],
    },
};
