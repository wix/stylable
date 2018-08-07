import { stylableModuleFactory } from '@stylable/node';
import * as fs from 'fs';
export const process = stylableModuleFactory({
    fileSystem: fs,
    requireModule: require,
    projectRoot: ''
});
