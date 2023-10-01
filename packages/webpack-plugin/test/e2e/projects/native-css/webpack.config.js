const { StylableWebpackPlugin, createWebpackResolver } = require('@stylable/webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

/** @type {import('webpack').Configuration} */
module.exports = {
    entry: ['./src/external.css', './src/index.js'],
    mode: 'development',
    context: __dirname,
    devtool: 'source-map',
    plugins: [
        new StylableWebpackPlugin({
            stylableConfig(config, compiler) {
                // set custom resolve for test

                const resolve = createWebpackResolver(compiler.inputFileSystem, {});
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
    /*JUST TO TEST THAT AN EXTERNAL ENTRY CSS IS SAFE TO USE */
    module: {
        rules: [
            {
                test: /\.css$/i,
                exclude: /\.st\.css?/,
                use: ['css-loader'],
            },
        ],
    },
};
