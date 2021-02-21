const { stylableLoaders } = require('@stylable/experimental-loader');
const { StylableManifestPlugin } = require('@stylable/webpack-extensions');

/** @type {import('webpack').Configuration} */
module.exports = {
    mode: 'development',
    context: __dirname,
    devtool: 'source-map',
    entry: './index.ts',
    output: {
        library: 'metadata',
    },
    plugins: [
        new StylableManifestPlugin({
            outputType: 'fs-manifest',
            package: require('./package.json'),
        }),
    ],
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.json'],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: '@ts-tools/webpack-loader',
            },
            {
                test: /\.st\.css?$/,
                use: [stylableLoaders.transform({ exportsOnly: true })],
            },
        ],
    },
};
