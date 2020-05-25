import { StylableWebpackPlugin } from '@stylable/webpack-plugin';
import { Configuration } from 'webpack';
const config: Configuration = {
    mode: 'development',
    context: __dirname,
    devtool: 'source-map',
    entry: './index.js',
    output: {
        library: 'metadata',
    },
    plugins: [new StylableWebpackPlugin()],
    resolveLoader: {
        alias: { metadata: require.resolve('../../../../src/stylable-metadata-loader.ts') },
    }
};

module.exports = config;
