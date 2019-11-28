#!/usr/bin/env node

const { normalize } = require('path');

// Use ts-tools to run typescript from source when running in the context of this mono-repo
if (__filename.endsWith(normalize('/packages/cli/cli.js'))) {
    require('@ts-tools/node/r');
    require('tsconfig-paths/register');
    require('./src/cli');
} else {
    require('./cjs/cli');
}
