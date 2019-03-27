const { StylableWebpackPlugin } = require('@stylable/webpack-plugin/src');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    mode: 'development',
    // mode: 'production',
    context: __dirname,
    devtool: 'source-map',
    plugins: [new StylableWebpackPlugin(), new HtmlWebpackPlugin()],
    optimization: {
        splitChunks: {
            maxAsyncRequests: 2,
            maxInitialRequests: 2,
            minSize: 10000000,
            cacheGroups: {
                default: {
                    minChunks: 2,
                    priority: -20,
                    reuseExistingChunk: true
                }
            }
        }
    }
};
