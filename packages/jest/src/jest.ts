import { stylableModuleFactory } from '@stylable/node';
import * as fs from 'fs';

export const process = stylableModuleFactory(
    {
        fileSystem: fs,
        requireModule: require,
        projectRoot: ''
    },
    // ensure the generated module points to our own @stylable/runtime copy
    // this allows @stylable/jest to be used as part of a globally installed CLI
    require.resolve('@stylable/runtime/package.json')
);
