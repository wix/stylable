const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const { StylableWebpackPlugin } = require('@stylable/webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const rootTsconfig = require.resolve('../../../../../../tsconfig.json');

module.exports = {
    mode: 'development',
    context: __dirname,
    devtool: 'source-map',
    resolve: {
        plugins: [new TsconfigPathsPlugin({ configFile: rootTsconfig })]
    },
    plugins: [new StylableWebpackPlugin(), new HtmlWebpackPlugin()]
};
