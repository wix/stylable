const { dirname, resolve } = require('path');

module.exports = {
    colors: true,
    'enable-source-maps': true,
    ...getRequire(),
};

function getRequire() {
    let launchedPath;
    const root = dirname(require.resolve('./package.json'));
    const packagesSet = new Set();
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

    if (process.env.LAUNCHED_FILE_RELATIVE_PATH) {
        launchedPath = dirname(
            resolve(process.env.WORKSPACE_FOLDER, process.env.LAUNCHED_FILE_RELATIVE_PATH)
        );
    } else {
        launchedPath = process.cwd();
    }

    return packagesSet.has(launchedPath) || root === launchedPath
        ? { require: require.resolve('@stylable/e2e-test-kit/dist/browser-server.js') }
        : {};
}
