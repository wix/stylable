const HtmlWebpackPlugin = require('html-webpack-plugin');

/** @type {import('webpack').Configuration} */
module.exports = {
    entry: './src/index.mjs',
    mode: 'development',
    context: __dirname,
    devtool: 'source-map',
    plugins: [
        new HtmlWebpackPlugin(),
    ],
    module: {
        rules: [
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
};
