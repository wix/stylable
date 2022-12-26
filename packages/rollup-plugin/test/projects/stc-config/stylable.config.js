//@ts-check
const { stcConfig } = require('@stylable/cli');
exports.stcConfig = stcConfig({
    options: {
        srcDir: './project/src',
        outDir: './dist',
        cjs: false,
        outputSources: true,
        useNamespaceReference: false,
    },
});
