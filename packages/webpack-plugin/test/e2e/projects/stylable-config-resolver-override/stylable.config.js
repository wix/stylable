//@ts-check
const { join } = require('path');
const { createWebpackResolver } = require('@stylable/webpack-plugin');

module.exports = {
    defaultConfig(fs) {
        return {
            resolveModule: createWebpackResolver(fs, {
                alias: {
                    'wp-alias': join(__dirname, 'src/wrong'),
                },
            }),
        };
    },
    webpackPlugin(defaultWebpackConfig, _compiler, fs) {
        return {
            ...defaultWebpackConfig,
            stylableConfig(defaultStylableConfig) {
                return {
                    ...defaultStylableConfig,
                    resolveModule: createWebpackResolver(fs, {
                        alias: {
                            'wp-alias': join(__dirname, 'src/webpack-alias'),
                        },
                    }),
                };
            },
        };
    },
};
