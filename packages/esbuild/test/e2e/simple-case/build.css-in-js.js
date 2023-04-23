const { stylablePlugin } = require('@stylable/esbuild');
const { createNamespaceStrategyNode } = require('@stylable/node');

module.exports.run = function run(build, options) {
    return build({
        ...options({
            entryPoints: ['./index'],
            plugins: [
                stylablePlugin({
                    cssInjection: 'js',
                    stylableConfig(config) {
                        return {
                            ...config,
                            resolveNamespace: createNamespaceStrategyNode({
                                hashFragment: 'minimal',
                                strict: true,
                            }),
                        };
                    },
                }),
            ],
        }),
        outdir: './dist',
    });
};
