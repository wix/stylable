import { join } from 'path';
import { bundle, ensureWrite, useModule } from './ts-lib-bundler';

const outModule = bundle({
    name: 'StylableRuntime',
    entry: join(__dirname, '../src/index.ts'),
    includeEntry: false,
    header: `/* runtime version: ${require('../package.json').version} */`
});

useModule(outModule, ['$', 'create', 'createRenderable', 'RuntimeRenderer']);

ensureWrite(join(__dirname, '../runtime.lib.js'), outModule);

/* LEGACY BUILD: 5/6/2019 */

const outModuleLegacy = bundle({
    name: 'StylableRuntime',
    entry: join(__dirname, '../src/index-legacy.ts'),
    includeEntry: false,
    header: `/* runtime version: ${require('../package.json').version} */`
});

useModule(outModuleLegacy, ['$', 'create', 'createRenderable', 'RuntimeRenderer'], ['create']);

ensureWrite(join(__dirname, '../runtime-legacy.lib.js'), outModuleLegacy);
