const { StylableWebpackPlugin } = require('@stylable/webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const autoprefixer = require('autoprefixer');
const postcss = require('postcss');
const autoprefixProcessor = postcss([autoprefixer]);

/** @type {import('webpack').Configuration} */
module.exports = {
    mode: 'development',
    context: __dirname,
    devtool: 'source-map',
    plugins: [
        new StylableWebpackPlugin({
            stylableConfig(config) {
                return {
                    ...config,
                    hooks: {
                        postProcessor: (stylableResult) => {
                            autoprefixProcessor.process(stylableResult.meta.outputAst).sync();
                            return stylableResult;
                        },
                    },
                };
            },
        }),
        new HtmlWebpackPlugin(),
    ],
};
