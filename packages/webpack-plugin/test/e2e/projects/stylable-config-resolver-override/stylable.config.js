//@ts-check
const { join } = require('path');
const { createLegacyResolver } = require('@stylable/webpack-plugin');

module.exports = {
    defaultConfig(fs) {
        return {
            resolveModule: createLegacyResolver(fs, {
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
                    resolveModule: createLegacyResolver(fs, {
                        alias: {
                            'wp-alias': join(__dirname, 'src/webpack-alias'),
                        },
                    }),
                };
            },
        };
    },
};
