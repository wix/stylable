import { readFileSync } from 'fs';

export const RUNTIME_SOURCE = readFileSync(
    require.resolve('@stylable/runtime/runtime.lib.js'),
    'utf8'
);

export const WEBPACK_STYLABLE = '__webpack_require__.stylable';
