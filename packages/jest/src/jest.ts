import { stylableModuleFactory } from '@stylable/node';
import * as fs from 'fs';

const stylableRuntimePath = require.resolve('@stylable/runtime');

export const process = stylableModuleFactory(
    {
        fileSystem: fs,
        requireModule: require,
        projectRoot: ''
    },
    // ensure the generated module points to our own @stylable/runtime copy
    // this allows @stylable/jest to be used as part of a globally installed CLI
    stylableRuntimePath
);

export function getCacheKey(
    fileData: string,
    filename: string,
    configString: string,
    { instrument }: { instrument: boolean }
) {
    return (
        fileData + configString + (instrument ? 'instrument' : '') + filename + stylableRuntimePath
    );
}
