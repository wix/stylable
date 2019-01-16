const { readFileSync } = require('fs');

const RUNTIME_SOURCE = readFileSync(require.resolve('@stylable/runtime/runtime.lib.js'), 'utf8');
const WEBPACK_STYLABLE = '__webpack_require__.stylable';

exports.WEBPACK_STYLABLE = WEBPACK_STYLABLE;
exports.RUNTIME_SOURCE = RUNTIME_SOURCE;
