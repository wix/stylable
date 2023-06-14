module.exports.baseConfig = () => {
    /** @type {import('webpack').Configuration} */
    const base = {
        mode: 'development',
        resolve: {
            alias: {
                path: require.resolve('@file-services/path'),
            },
            fallback: {
                // used only by schema-extract jest-docblock
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
