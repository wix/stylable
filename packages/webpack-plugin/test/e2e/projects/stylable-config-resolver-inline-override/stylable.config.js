//@ts-check
const { join } = require('path');
const { createDefaultResolver } = require('@stylable/core');

module.exports = {
    defaultConfig(fs) {
        return {
            resolveModule: createDefaultResolver(fs, {
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
                    resolveModule: createDefaultResolver(fs, {
                        alias: {
                            'wp-alias': join(__dirname, 'src/still-wrong'),
                        },
                    }),
                    ...defaultStylableConfig,
                };
            },
        };
    },
};
