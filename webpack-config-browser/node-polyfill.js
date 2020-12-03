module.exports = {
    deprecate(fn) {
        return fn;
    },
    process: {
        title: 'browser',
        browser: true,
        versions: {},
        env: {},
        cwd() {
            return '/';
        },
    },
};
