const { ProvidePlugin } = require('webpack');

module.exports.baseConfig = () => {
    /** @type {import('webpack').Configuration} */
    const base = {
        mode: 'development',
        resolve: {
            alias: {
                jsdom: require.resolve('./jsdom-browser.js'),
            },
            fallback: {
                path: require.resolve('@file-services/path'),
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
