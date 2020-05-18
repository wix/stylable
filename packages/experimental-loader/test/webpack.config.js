const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HTMLWebpackPlugin = require('html-webpack-plugin');
const { stylableLoaders } = require('../src');
module.exports = {
    mode: 'development',
    entry: {
        // case1: './use-case-1/foo.js',
        case2: './use-case-2/app.js',
    },
    devtool: false,
    plugins: [new MiniCssExtractPlugin(), new HTMLWebpackPlugin()],
    module: {
        rules: [
            {
                test: /\.(png|jpg|gif)$/i,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            limit: 8192,
                        },
                    },
                ],
            },
            {
                test: /\.st\.css$/i,
                use: [
                    stylableLoaders.runtime(),
                    {
                        loader: MiniCssExtractPlugin.loader,
                        options: { esModule: true, reloadAll: true },
                    },
                    stylableLoaders.transform(),
                ],
            },
        ],
    },
};
