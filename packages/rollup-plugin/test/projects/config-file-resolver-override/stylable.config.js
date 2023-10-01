//@ts-check
module.exports = {
    defaultConfig(fs) {
        const { createDefaultResolver } = require('@stylable/core');
        const { join } = require('path');
        return {
            resolveModule: createDefaultResolver({
                fs,
                alias: {
                    'components/*': join(__dirname, 'src/components') + '/*',
                },
            }),
        };
    },
};
