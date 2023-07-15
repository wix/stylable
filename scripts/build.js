// @ts-check

const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

const packagesRoot = path.join(__dirname, '..', 'packages');

buildPureEsmRuntime();
buildCoreLib();
/**
 * duplicate the pure.js file from the dist folder in to a .mjs file
 */
function buildPureEsmRuntime() {
    const projectRoot = path.join(packagesRoot, 'runtime');

    const pureJs = path.join(projectRoot, 'dist', 'pure.js');
    const pureMjs = path.join(projectRoot, 'dist', 'pure.mjs');

    fs.copyFileSync(pureJs, pureMjs);
}

function buildCoreLib() {
    const coreRoot = path.join(packagesRoot, 'core');
    const outCjs = `./dist/stylable.lib.cjs`;
    const outEsm = `./dist/stylable.lib.mjs`;

    bundle(coreRoot, 'cjs', outCjs);
    bundle(coreRoot, 'esm', outEsm);
}
function bundle(coreRoot, format, outfile) {
    esbuild
        .build({
            absWorkingDir: coreRoot,
            entryPoints: ['./src/index.ts'],
            outfile,
            bundle: true,
            format,
            platform: 'browser',
            sourcemap: true,
            minify: true,
            write: true,
            alias: {
                path: '@file-services/path',
                // remove after moving the defaultResolver from core
                'enhanced-resolve/lib/ResolverFactory.js': path.join(
                    coreRoot,
                    'src',
                    'enhanced-resolve-alias.ts'
                ),
            },
        })
        .then(({ errors, warnings }) => {
            if (errors.length || warnings.length) {
                console.error('build errors', errors);
                console.warn('build warnings', warnings);
                process.exitCode = 1;
            }
        })
        .catch((e) => {
            console.error(e);
            process.exitCode = 1;
        });
}
