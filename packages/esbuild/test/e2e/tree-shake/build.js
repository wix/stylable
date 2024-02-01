const { stylablePlugin } = require('@stylable/esbuild');
const { rmSync, existsSync } = require('node:fs');
const { join } = require('node:path');

module.exports.cssInJsDev = (build, options) => run('js', build, options);
module.exports.cssBundleProd = (build, options) => run('css', build, options);

function run(cssInjection, build, options) {
    const outdir = cssInjection === 'css' ? 'dist-bundle' : 'dist';
    const path = join(__dirname, outdir);
    if (existsSync(path)) {
        rmSync(path, { recursive: true, force: true });
    }
    return build({
        ...options({
            entryPoints: ['./index'],
            plugins: [
                stylablePlugin({
                    mode: cssInjection === 'css' ? 'production' : 'development',
                    cssInjection,
                }),
            ],
        }),
        outdir,
    });
}
