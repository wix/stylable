const { StylableWebpackPlugin } = require('@stylable/webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { join } = require('path');
const { createWebpackResolver } = require('@stylable/webpack-plugin');

/** @type {import('webpack').Configuration} */
module.exports = {
    mode: 'development',
    context: __dirname,
    devtool: 'source-map',
    plugins: [
        new StylableWebpackPlugin({
            stylableConfig: (config) => ({
                ...config,
                resolveModule: createWebpackResolver(config.fileSystem, {
                    alias: {
                        'wp-alias': join(__dirname, 'src/webpack-alias'),
                    },
                }),
            }),
        }),
        new HtmlWebpackPlugin(),
    ],
};
