const { StylableWebpackPlugin } = require('@stylable/webpack-plugin/src');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    mode: 'development',
    entry: {
        entryA: './src/index-a.js',
        entryB: './src/index-b.js'
    },
    // mode: 'production',
    context: __dirname,
    devtool: 'source-map',
    plugins: [new StylableWebpackPlugin({useWeakDeps: true}), new HtmlWebpackPlugin()],
    optimization: {
        splitChunks: {
            chunks: 'all',
            maxInitialRequests: 1,
        }
    }
};
