const { join } = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const { ProvidePlugin } = require('webpack');

const monorepoRoot = join(__dirname, '..');

module.exports.baseConfig = () => {
    return {
        mode: 'development',
        output: {
            filename: '[name].bundle.js',
        },
        resolve: {
            alias: {
                jsdom: join(__dirname, 'jsdom-browser.js'),
            },
            fallback: {
                fs: false,
                os: false,
                path: require.resolve('@file-services/path/browser-path.js'),
                util: join(__dirname, 'node-polyfill.js'),
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
            new ProvidePlugin({
                process: ['util', 'process'],
            }),
        ],
    };
};
