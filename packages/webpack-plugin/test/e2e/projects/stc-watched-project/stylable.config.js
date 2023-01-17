//@ts-check
const { stcConfig } = require('@stylable/cli');
exports.stcConfig = stcConfig({
    options: {
        srcDir: './style-source',
        outDir: './style-output',
        cjs: false,
        outputSources: true,
        useNamespaceReference: false,
    },
});
