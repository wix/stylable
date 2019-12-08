const { join } = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const testFiles = require('glob').sync('./test/**/*.spec.ts');
const first = testFiles.shift();
const withMochaLoader = [`mocha-loader!${first}`].concat(testFiles);

const monorepoRoot = join(__dirname, '..', '..');

module.exports = {
    mode: 'development',
    entry: {
        tests: withMochaLoader
    },
    output: {
        filename: '[name].bundle.js'
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.mjs', '.js', '.json'],
        plugins: [new TsconfigPathsPlugin({ configFile: join(monorepoRoot, 'tsconfig.json') })]
    },
    node: {
        fs: 'empty'
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: '@ts-tools/webpack-loader'
            }
        ]
    }
};
