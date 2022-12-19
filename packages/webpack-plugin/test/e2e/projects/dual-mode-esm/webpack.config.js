const { StylableWebpackPlugin } = require('@stylable/webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
/** @type {import('webpack').Configuration[]} */
module.exports = [
    {
        [Symbol.for('TestRunnerInternalPath')]: 'vanilla',
        entry: './src/index.mjs',
        mode: 'development',
        context: __dirname,
        devtool: 'source-map',
        plugins: [new HtmlWebpackPlugin()],
    },
    {
        [Symbol.for('TestRunnerInternalPath')]: 'stylable',
        entry: './src/index.mjs',
        mode: 'development',
        context: __dirname,
        devtool: 'source-map',
        plugins: [
            new HtmlWebpackPlugin(),
            new StylableWebpackPlugin({ depthStrategy: 'css', runtimeStylesheetId: 'namespace' }),
        ],
    },
];
