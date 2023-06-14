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
                        result.meta.diagnostics.report(
                            {
                                code: '99999',
                                message: 'test info diagnostic!',
                                severity: 'info',
                            },
                            { node: result.meta.sourceAst.root() }
                        );
                        return result;
                    },
                },
            }),
        }),
        new HtmlWebpackPlugin(),
    ],
};
