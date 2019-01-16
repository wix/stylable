import { join } from 'path';
import { bundle, ensureWrite, useModule } from './ts-lib-bundler';

const outModule = bundle('StylableRuntime', join(__dirname, '../src/index.ts'));

useModule(outModule, ['$', 'create', 'RuntimeRenderer']);

ensureWrite(join(__dirname, '../runtime.lib.js'), outModule);
