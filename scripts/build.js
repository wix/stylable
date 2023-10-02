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

    const pureJs = path.join(projectRoot, 'esm', 'index.js');
    const pureMjs = path.join(projectRoot, 'dist', 'index.mjs');

    const pureDts = path.join(projectRoot, 'esm', 'index.d.ts');
    const pureDMts = path.join(projectRoot, 'dist', 'index.d.mts');

    fs.copyFileSync(pureJs, pureMjs);
    fs.copyFileSync(pureDts, pureDMts);
}

function buildCoreLib() {
    const coreRoot = path.join(packagesRoot, 'core');
    // bundle({
    //     absWorkingDir: coreRoot,
    //     format: 'iife',
    //     outfile: `./dist/lib.js`,
    //     globalName: 'StylableCore',
    // });
    bundle({
        absWorkingDir: coreRoot,
        format: 'cjs',
        outfile: `./dist/lib.cjs`,
    });
    bundle({
        absWorkingDir: coreRoot,
        format: 'esm',
        outfile: `./dist/lib.mjs`,
    });
}
function bundle(options) {
    esbuild
        .build({
            entryPoints: ['./src/index.ts'],
            bundle: true,
            platform: 'browser',
            sourcemap: true,
            minify: true,
            write: true,
            alias: {
                path: '@file-services/path',
                // remove after moving the defaultResolver from core
                'enhanced-resolve/lib/ResolverFactory.js': path.join(
                    options.absWorkingDir,
                    'src',
                    'enhanced-resolve-alias.ts'
                ),
            },
            ...options,
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
