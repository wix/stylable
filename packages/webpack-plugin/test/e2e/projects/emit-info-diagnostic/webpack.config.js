const { StylableWebpackPlugin } = require('@stylable/webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

/** @type {import('webpack').Configuration} */
module.exports = {
    mode: 'development',
    context: __dirname,
    devtool: 'source-map',
    plugins: [
        new StylableWebpackPlugin({
            diagnosticsMode: 'strict', // to make sure that every diagnostic which is not "info" will be fatal.
            stylableConfig: (config) => ({
                ...config,
                hooks: {
                    postProcessor: (result) => {
                        // Todo: replace implementation with permanent info diagnostic
                        result.meta.diagnostics.info(
                            result.meta.ast.root(),
                            'test info diagnostic!'
                        );
                        return result;
                    },
                },
            }),
        }),
        new HtmlWebpackPlugin(),
    ],
};
