const { nodeFs } = require('@file-services/node');
const { dirname } = require('path');

module.exports = {
    colors: true,
    'enable-source-maps': true,
    ...getRequire(),
};

function getRequire() {
    let launchedPath;
    const root = dirname(require.resolve('./package.json'));
    const packagesSet = new Set([root]);
    const packages = [
        'webpack-plugin',
        'rollup-plugin',
        'webpack-extensions',
        'custom-value',
        'experimental-loader',
    ];

    for (const package of packages) {
        packagesSet.add(dirname(require.resolve(`@stylable/${package}/package.json`)));
    }

    // we get this env variable from ./.vscode/launch.json (f5 - Mocha Current)
    if (process.env.FILE) {
        launchedPath = dirname(nodeFs.findClosestFileSync(process.env.FILE, './package.json'));
    } else {
        launchedPath = process.cwd();
    }

    return packagesSet.has(launchedPath)
        ? { require: require.resolve('@stylable/e2e-test-kit/dist/browser-server.js') }
        : {};
}
