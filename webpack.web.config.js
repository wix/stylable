const path = require('path');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;


module.exports = {
    devtool: 'eval',
    entry: './src/index.ts',
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: 'web.bundle.js',
        library: "stylable",
        libraryTarget: "umd"
    },
    resolve: {
        // Add `.ts` and `.tsx` as a resolvable extension.
        extensions: ['.ts', '.tsx', '.js'] // note if using webpack 1 you'd also need a '' in the array as well
    },
    node: {
        fs: "empty"
    },
    module: {
        loaders: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                options: { transpileOnly: true }
            }
        ]
    },
    plugins: [
        // new UglifyJSPlugin()
        // new BundleAnalyzerPlugin(),
    ]
}

