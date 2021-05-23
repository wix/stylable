module.exports.baseConfig = () => {
    /** @type {import('webpack').Configuration} */
    const base = {
        mode: 'development',
        resolve: {
            alias: {
                jsdom: require.resolve('./jsdom-browser.js'),
                path: require.resolve('@file-services/path'),
            },
            fallback: {
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
        devServer: { host: 'localhost' },
    };
    return base;
};
