import unknownLocals from './stylable-es-lint.js';

export default {
    rules: {
        'unknown-locals': unknownLocals as unknown,
    },
    configs: {
        recommended: {
            plugins: ['stylable'],
            rules: {
                'stylable/unknown-locals': 2,
            },
        },
    },
};
