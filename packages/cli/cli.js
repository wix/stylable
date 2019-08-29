#!/usr/bin/env node

const { normalize } = require('path');

if (__filename.endsWith(normalize('/packages/cli/cli.js'))) {
    require('@ts-tools/node/r');
    require('./src/cli');
} else {
    require('./cjs/cli');
}
