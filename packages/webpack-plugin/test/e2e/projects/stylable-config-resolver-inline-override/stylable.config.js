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
    webpackPlugin(defaultWebpackConfig) {
        return {
            ...defaultWebpackConfig,
            stylableConfig(defaultStylableConfig) {
                return { ...defaultStylableConfig };
            },
        };
    },
};
