module.exports.webpackPlugin = function (config) {
    return {
        ...config,
        cssInjection: 'css',
        filename: 'test.css',
        optimize: {
            shortNamespaces: true,
            minify: true
        }
    };
};
