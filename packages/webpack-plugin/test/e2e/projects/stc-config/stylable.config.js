//@ts-check
const { typedConfiguration } = require('@stylable/cli');
exports.stcConfig = typedConfiguration({
    options: {
        srcDir: './src',
        outDir: './dist',
        cjs: false,
        outputSources: true,
    },
});
