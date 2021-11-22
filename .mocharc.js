const findConfig = require('find-config');
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

    if (process.env.FILE) {
        launchedPath = dirname(findConfig('./package.json', { cwd: process.env.FILE }));
    } else {
        launchedPath = process.cwd();
    }

    return packagesSet.has(launchedPath)
        ? { require: require.resolve('@stylable/e2e-test-kit/dist/browser-server.js') }
        : {};
}
