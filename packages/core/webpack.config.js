const { join } = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const testFiles = require('glob').sync('./test/**/*.spec.ts');
const first = testFiles.shift();
const withMochaLoader = [`mocha-loader!${first}`].concat(testFiles);
const webpack = require('webpack')
const monorepoRoot = join(__dirname, '..', '..');

/** @type import('webpack').Configuration */
module.exports = {
    mode: 'development',
    entry: {
        tests: withMochaLoader,
    },
    output: {
        filename: '[name].bundle.js',
    },
    resolve: {
        alias: {
            path: require.resolve('@file-services/path/browser-path.js'),
        },
        fallback: {
            fs: false,
            os: false,
            util: join(__dirname,'/node-polyfill.js')
        },
        extensions: ['.ts', '.tsx', '.mjs', '.js', '.json'],
        plugins: [new TsconfigPathsPlugin({ configFile: join(monorepoRoot, 'tsconfig.json') })],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: '@ts-tools/webpack-loader',
            },
        ],
    },
    plugins: [
        new webpack.ProvidePlugin({
            process: ['util', 'process']
        })
    ]
};
