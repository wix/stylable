const { stylablePlugin } = require('@stylable/esbuild');
const { rmSync, existsSync } = require('node:fs');
const { join } = require('node:path');

module.exports.run = (build, options) => {
    const outdir = 'dist';
    const path = join(__dirname, outdir);
    if (existsSync(path)) {
        rmSync(path, { recursive: true, force: true });
    }
    return build({
        ...options({
            entryPoints: ['./index'],
            plugins: [stylablePlugin({ cssInjection: 'js' })],
        }),
        outdir,
    });
};
