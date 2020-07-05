import { StylableMetadataPlugin } from '@stylable/webpack-extensions';
import { StylableWebpackPlugin } from '@stylable/webpack-plugin';
import { basename } from 'path';
const HtmlWebpackPlugin = require('html-webpack-plugin');

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
            mode: 'amd:factory',
        }),
        new HtmlWebpackPlugin(),
    ],
};
