//@ts-check
const { typedConfiguration } = require('@stylable/cli');
exports.stcConfig = typedConfiguration({
    options: {
        srcDir: './project/src',
        outDir: './dist',
        cjs: false,
        outputSources: true,
    },
});
