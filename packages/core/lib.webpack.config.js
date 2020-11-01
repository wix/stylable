const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
    mode: 'production',
    entry: {
        stylable: './src/stylable.ts',
    },
    output: {
        filename: '[name].lib.bundle.js',
        library: 'Stylable',
        libraryTarget: 'umd',
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js'],
        alias: {
            'source-map': __dirname + '/empty-object.js',
            chalk: __dirname + '/empty-object.js',
            'support-color': __dirname + '/empty-object.js',
        },
    },
    node: {
        fs: 'empty',
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: '@ts-tools/webpack-loader',
            },
        ],
    },
    plugins: [
        new BundleAnalyzerPlugin(),
    ],
};
