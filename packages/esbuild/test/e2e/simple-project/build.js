module.exports.run = function run(build, o) {
    return build(
        o({
            entryPoints: ['./index'],
            plugins: [],
        })
    );
};
