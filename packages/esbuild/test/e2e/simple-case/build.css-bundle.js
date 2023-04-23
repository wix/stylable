const { stylablePlugin } = require('@stylable/esbuild');

module.exports.run = function run(build, options) {
    return build({
        ...options({
            entryPoints: ['./index'],
            plugins: [
                stylablePlugin({
                    cssInjection: 'css',
                }),
            ],
        }),
        outdir: './dist-bundle',
    });
};
