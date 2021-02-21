const { join } = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const { ProvidePlugin } = require('webpack');

const monorepoRoot = join(__dirname, '..');

module.exports.baseConfig = () => {
    /** @type import('webpack').Compiler */
    const base = {
        mode: 'development',
        resolve: {
            alias: {
                jsdom: require.resolve('./jsdom-browser.js'),
                path: require.resolve('@file-services/path/browser-path.js'),
                util: require.resolve('./node-polyfill.js'),
            },
            fallback: {
                fs: false,
                os: false,
            },
            extensions: ['.ts', '.tsx', '.js', '.json'],
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
        devServer: { host: 'localhost' },
    };
    return base;
};
