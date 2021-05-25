const { StylableWebpackPlugin } = require('@stylable/webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { join } = require('path');

/** @type {import('webpack').Configuration} */
module.exports = {
    mode: 'development',
    context: __dirname,
    devtool: 'source-map',
    plugins: [
        new StylableWebpackPlugin({
            cssInjection: 'css',
            assetFilter(url, context) {
                if (join(__dirname, 'src') === context && url === './unprocessed.png') {
                    return false;
                } else {
                    return true;
                }
            },
        }),
        new HtmlWebpackPlugin(),
    ],
};
