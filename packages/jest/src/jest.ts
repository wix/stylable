import { StylableConfig } from '@stylable/core';
import { Options, stylableModuleFactory } from '@stylable/module-utils';
import fs from 'fs';

export function processFactory(
    stylableConfig?: Partial<StylableConfig>,
    factoryOptions?: Partial<Options>
) {
    return stylableModuleFactory(
        {
            fileSystem: fs,
            requireModule: require,
            projectRoot: '',
            ...stylableConfig
        },
        // ensure the generated module points to our own @stylable/runtime copy
        // this allows @stylable/jest to be used as part of a globally installed CLI
        { runtimePath: require.resolve('@stylable/runtime'), ...factoryOptions }
    );
}

export const process = processFactory();
