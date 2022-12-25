// @ts-check

const { stcConfig } = require('@stylable/cli');

exports.stcConfig = stcConfig({
    options: {
        srcDir: './src',
        outDir: './st-types',
        dts: true,
    },
});
