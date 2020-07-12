import type { StylableConfig } from '@stylable/core';
import { Options, stylableModuleFactory } from '@stylable/module-utils';
import fs from 'fs';

const stylableRuntimePath = require.resolve('@stylable/runtime');
const stylableCorePath = require.resolve('@stylable/core');
const { version: runtimeVersion } = require('@stylable/runtime/package.json') as {
    version: string;
};
const { version: coreVersion } = require('@stylable/core/package.json') as { version: string };

export function processFactory(
    stylableConfig?: Partial<StylableConfig>,
    factoryOptions?: Partial<Options>
) {
    return stylableModuleFactory(
        {
            fileSystem: fs,
            requireModule: require,
            projectRoot: '',
            ...stylableConfig,
        },
        // ensure the generated module points to our own @stylable/runtime copy
        // this allows @stylable/jest to be used as part of a globally installed CLI
        { runtimePath: stylableRuntimePath, ...factoryOptions }
    );
}

export const process = processFactory();

export function getCacheKey(
    fileData: string,
    filename: string,
    configString: string,
    { instrument }: { instrument: boolean }
) {
    return (
        fileData +
        configString +
        (instrument ? 'instrument' : '') +
        filename +
        stylableRuntimePath +
        runtimeVersion +
        stylableCorePath +
        coreVersion
    );
}
