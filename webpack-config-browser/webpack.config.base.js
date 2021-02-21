const { ProvidePlugin } = require('webpack');

module.exports.baseConfig = () => {
    /** @type {import('webpack').Configuration} */
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
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    loader: '@ts-tools/webpack-loader',
                },
                {
                    test: /\.js$/,
                    enforce: 'pre',
                    loader: 'source-map-loader',
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
