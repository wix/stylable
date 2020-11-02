module.exports = {
    deprecate(fn) {
        return fn;
    },
    process: {
        title: 'browser',
        browser: true,
        env: {},
        cwd() {
            return '/';
        },
    },
};
