const { stylablePlugin } = require('@stylable/esbuild');
const { createNamespaceStrategyNode } = require('@stylable/node');

module.exports.cssInJsDev = (build, options) => {
    run('js', build, options);
};

module.exports.cssBundleProd = (build, options) => {
    run('css', build, options);
};

function run(cssInjection, build, options) {
    return build({
        ...options({
            entryPoints: ['./index'],
            plugins: [
                stylablePlugin({
                    mode: cssInjection === 'css' ? 'production' : 'development',
                    cssInjection,
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
        outdir: cssInjection === 'css' ? './dist-bundle' : 'dist',
    });
}
