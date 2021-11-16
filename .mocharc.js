const { dirname } = require('path');

module.exports = {
    colors: true,
    'enable-source-maps': true,
    ...getRequire(),
};

function getRequire() {
    const packages = [
        'webpack-plugin',
        'rollup-plugin',
        'webpack-extensions',
        'custom-value',
        'experimental-loader',
    ];
    const root = dirname(require.resolve('./package.json'));
    const packagesSet = new Set([root]);
    for (const package of packages) {
        packagesSet.add(dirname(require.resolve(`@stylable/${package}/package.json`)));
    }
    return packagesSet.has(process.cwd())
        ? { require: require.resolve('@stylable/e2e-test-kit/dist/browser-server.js') }
        : {};
}
