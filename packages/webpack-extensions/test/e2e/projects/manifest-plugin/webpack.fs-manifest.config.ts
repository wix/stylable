import { Configuration } from 'webpack';
import { stylableLoaders } from '@stylable/experimental-loader';
import { StylableManifestPlugin } from '../../../../src/stylable-manifest-plugin';

const config: Configuration = {
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
        extensions: ['.ts', '.tsx', '.mjs', '.js', '.json'],
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

export default config;
