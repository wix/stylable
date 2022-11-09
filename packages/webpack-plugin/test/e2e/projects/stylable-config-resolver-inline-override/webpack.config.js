const { StylableWebpackPlugin } = require('@stylable/webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { join } = require('path');
const { createDefaultResolver } = require('@stylable/core');

console.log('########', join(__dirname, 'src/webpack-alias'));

/** @type {import('webpack').Configuration} */
module.exports = {
    mode: 'development',
    context: __dirname,
    devtool: 'source-map',
    plugins: [
        new StylableWebpackPlugin({
            stylableConfig: (config) => ({
                ...config,
                resolveModule: createDefaultResolver(config.fileSystem, {
                    alias: {
                        'wp-alias': join(__dirname, 'src/webpack-alias'),
                    },
                }),
            }),
        }),
        new HtmlWebpackPlugin(),
    ],
};
