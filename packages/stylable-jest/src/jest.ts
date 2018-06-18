import * as fs from 'fs';
import { stylableModuleFactory } from 'stylable-node';
export const process = stylableModuleFactory({
    fileSystem: fs,
    requireModule: require,
    projectRoot: ''
});
