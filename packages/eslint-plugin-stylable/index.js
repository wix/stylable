const { normalize } = require('path');

// Use ts-tools to run typescript from source when running in the context of this mono-repo
if (__filename.endsWith(normalize('/packages/eslint-plugin-stylable/index.js'))) {
    require('@ts-tools/node/r');
    require('tsconfig-paths/register');
    module.exports = require('./src/index').stylableEslintPlugin;
} else {
    module.exports = require('./cjs/index').stylableEslintPlugin;
}
