const { ProvidePlugin } = require('webpack');

module.exports.baseConfig = () => {
    /** @type {import('webpack').Configuration} */
    const base = {
        mode: 'development',
        resolve: {
            alias: {
                jsdom: require.resolve('./jsdom-browser.js'),
                path: require.resolve('@file-services/path'),
                util: require.resolve('./node-polyfill.js'),
            },
            fallback: {
                fs: false,
                os: false,
            },
        },
        module: {
            rules: [
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
