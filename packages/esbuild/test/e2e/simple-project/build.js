const { stylablePlugin } = require('@stylable/esbuild');

module.exports.run = function run(build, o) {
    return build(
        o({
            entryPoints: ['./index'],
            plugins: [stylablePlugin()],
        })
    );
};
