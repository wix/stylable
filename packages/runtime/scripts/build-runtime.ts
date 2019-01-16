import { join } from 'path';
import { bundle, ensureWrite, useModule } from './ts-lib-bundler';

const outModule = bundle({
    name: 'StylableRuntime',
    entry: join(__dirname, '../src/index.ts'),
    includeEntry: false
});

useModule(outModule, ['$', 'create', 'RuntimeRenderer']);

ensureWrite(join(__dirname, '../runtime.lib.js'), outModule);
