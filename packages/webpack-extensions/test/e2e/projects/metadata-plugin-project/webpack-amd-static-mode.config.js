const { basename } = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { StylableMetadataPlugin } = require('@stylable/webpack-extensions');
const { StylableWebpackPlugin } = require('@stylable/webpack-plugin');

/** @type {import('webpack').Configuration} */
module.exports = {
    mode: 'development',
    context: __dirname,
    devtool: 'source-map',
    plugins: [
        new StylableWebpackPlugin({
            optimize: {
                shortNamespaces: true,
            },
        }),
        new StylableMetadataPlugin({
            name: 'test',
            version: '1.0.0',
            renderSnapshot(_exp, res) {
                return `<snapshot>${basename(res.resource)}</snapshot>`;
            },
            mode: 'amd:static',
        }),
        new HtmlWebpackPlugin(),
    ],
};
