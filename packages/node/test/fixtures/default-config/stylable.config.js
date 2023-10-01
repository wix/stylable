//@ts-check
const { posix: {join} } = require('path');
const { createDefaultResolver } = require('@stylable/core');

module.exports = {
    defaultConfig(fs) {
        return {
            resolveModule: createDefaultResolver({
                fs,
                alias: {
                    'wp-alias/*': join(__dirname, 'webpack-alias1') + '/*',
                },
            }),
        };
    },
};
