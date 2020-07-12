import { StylableWebpackPlugin } from '@stylable/webpack-plugin';
import { metadataLoaderLocation } from '@stylable/webpack-extensions';
import type { Configuration } from 'webpack';
const config: Configuration = {
    mode: 'development',
    context: __dirname,
    devtool: 'source-map',
    entry: './index.ts',
    output: {
        library: 'metadata',
    },
    plugins: [new StylableWebpackPlugin()],
    resolve: {
        extensions: ['.ts', '.tsx', '.mjs', '.js', '.json'],
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

module.exports = config;
