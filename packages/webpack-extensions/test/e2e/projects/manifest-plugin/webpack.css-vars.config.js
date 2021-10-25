const { stylableLoaders } = require('@stylable/experimental-loader');
const {
    StylableManifestPlugin,
    generateCssVarsNamedExport,
} = require('@stylable/webpack-extensions');

/** @type {import('webpack').Configuration} */
module.exports = {
    mode: 'development',
    context: __dirname,
    devtool: 'source-map',
    entry: require.resolve('./index'),
    output: {
        library: 'metadata',
    },
    plugins: [
        new StylableManifestPlugin({
            package: require('./package.json'),
            generateNamedExports: generateCssVarsNamedExport,
        }),
    ],
    module: {
        rules: [
            {
                test: /\.st\.css?$/,
                use: [stylableLoaders.transform({ exportsOnly: true })],
            },
        ],
    },
};
