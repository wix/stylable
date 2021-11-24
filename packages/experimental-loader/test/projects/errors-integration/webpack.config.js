const { stylableLoaders } = require('@stylable/experimental-loader');

/** @type {import('webpack').Configuration} */
module.exports = {
    mode: 'development',
    entry: './index.js',
    context: __dirname,
    devtool: false,
    module: {
        rules: [
            {
                test: /(\.st\.css$)|(\.stcss$)/i,
                use: [
                    stylableLoaders.transform({
                        exportsOnly: true,
                    }),
                ],
            },
        ],
    },
};
