const HtmlWebpackPlugin = require('html-webpack-plugin');
// const MiniCssExtractPlugin = require('mini-css-extract-plugin');
// const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

/** @type {import('webpack').Configuration} */
module.exports = {
    entry: './src/index.mjs',
    mode: 'development',
    context: __dirname,
    devtool: 'source-map',
    plugins: [new HtmlWebpackPlugin(), /*new MiniCssExtractPlugin()*/],
    module: {
        rules: [
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
                // use: [MiniCssExtractPlugin.loader, 'css-loader'],
            },
        ],
    },
    optimization: {
        // minimize: true,
        // minimizer: [new CssMinimizerPlugin()],
        splitChunks: {
            cacheGroups: {
                styles: {
                    name: 'styles',
                    type: 'css/mini-extract',
                    chunks: 'all',
                    enforce: true,
                },
            },
        },
    },
};
