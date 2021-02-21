const { stylableLoaders } = require('@stylable/experimental-loader');

/** @type {import('webpack').Configuration} */
module.exports = {
    mode: 'development',
    entry: './index.js',
    context: __dirname,
    devtool: false,
    output: { publicPath: '' },
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
