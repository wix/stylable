const { createDefaultResolver } = require('@stylable/core');
const { StylableWebpackPlugin } = require('@stylable/webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

/** @type {import('webpack').Configuration} */
module.exports = {
    mode: 'development',
    context: __dirname,
    devtool: 'source-map',
    plugins: [
        new StylableWebpackPlugin({
            stylableConfig(config, compiler) {
                // set custom resolve for test
                const resolve = createDefaultResolver(compiler.inputFileSystem, {});
                config.resolveModule = (path, request) => {
                    if (request === './resolve-me') {
                        return resolve(path, './custom-resolved.css');
                    }
                    return resolve(path, request);
                };
                return config;
            },
        }),
        new HtmlWebpackPlugin(),
    ],
};
