const fs = require('node:fs');
const path = require('node:path');

buildPureEsmRuntime();

/**
 * duplicate the pure.js file from the dist folder in to a .mjs file
 */
function buildPureEsmRuntime() {
    const projectRoot = path.join(__dirname, '..', 'packages', 'runtime');

    const pureJs = path.join(projectRoot, 'dist', 'pure.js');
    const pureMjs = path.join(projectRoot, 'dist', 'pure.mjs');

    fs.copyFileSync(pureJs, pureMjs);
}
