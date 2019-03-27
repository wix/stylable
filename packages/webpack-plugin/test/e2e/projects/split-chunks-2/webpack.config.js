const { StylableWebpackPlugin } = require('@stylable/webpack-plugin/src');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    mode: 'development',
    context: __dirname,
    devtool: 'source-map',
    plugins: [new StylableWebpackPlugin({useEntryModuleInjection: true}), new HtmlWebpackPlugin()],
    optimization: {
        splitChunks: {
            minSize: 0,
            chunks: 'all',
            name: false
        },
        runtimeChunk: {
            name: 'test-runtime'
        }
    }
};
