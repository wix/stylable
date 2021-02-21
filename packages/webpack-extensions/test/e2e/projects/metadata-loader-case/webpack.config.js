const { StylableWebpackPlugin } = require('@stylable/webpack-plugin');
const { metadataLoaderLocation } = require('@stylable/webpack-extensions');

/** @type {import('webpack').Configuration} */
module.exports = {
    mode: 'development',
    context: __dirname,
    devtool: false,
    entry: require.resolve('./index'),
    output: {
        library: 'metadata',
    },
    plugins: [new StylableWebpackPlugin()],
    resolveLoader: {
        alias: {
            'stylable-metadata': metadataLoaderLocation,
        },
    },
};
