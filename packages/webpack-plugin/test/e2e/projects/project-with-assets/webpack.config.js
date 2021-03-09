const { StylableWebpackPlugin } = require('@stylable/webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
module.exports = {
    mode: 'development',
    context: __dirname,
    devtool: 'source-map',
    plugins: [new StylableWebpackPlugin(), new HtmlWebpackPlugin()],
    module: {
        rules: [
            {
                test: /\.(png|jpg|gif)$/,
                type: 'asset/resource',
                generator: {
                    filename: 'static/[name][ext]',
                },
            },
            {
                test: /\.(svg)$/,
                type: 'asset',
                generator: {
                    filename: 'static/[name][ext]',
                },
                parser: {
                    dataUrlCondition: {
                        maxSize: 4 * 1024, // 4kb
                    },
                },
            },
        ],
    },
};
