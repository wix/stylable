//@ts-check
const { typedConfiguration } = require('@stylable/cli');
exports.stcConfig = typedConfiguration({
    options: {
        srcDir: './style-source',
        outDir: './style-output',
        cjs: false,
        outputSources: true,
    },
});
