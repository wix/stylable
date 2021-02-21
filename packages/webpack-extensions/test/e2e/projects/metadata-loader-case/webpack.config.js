const { StylableWebpackPlugin } = require('@stylable/webpack-plugin');
const { metadataLoaderLocation } = require('@stylable/webpack-extensions');

/** @type {import('webpack').Configuration} */
module.exports = {
    mode: 'development',
    context: __dirname,
    devtool: false,
    entry: './index.ts',
    output: {
        library: 'metadata',
    },
    plugins: [new StylableWebpackPlugin()],
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.json'],
    },
    resolveLoader: {
        alias: {
            'stylable-metadata': metadataLoaderLocation,
        },
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: '@ts-tools/webpack-loader',
            },
        ],
    },
};
