import unknownLocals from './stylable-es-lint';

export = {
    rules: {
        'unknown-locals': unknownLocals,
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
