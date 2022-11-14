import fs from 'fs';
import type { StylableConfig } from '@stylable/core';
import { stylableModuleFactory } from '@stylable/module-utils';
import { resolveNamespace } from '@stylable/node';

const stylableRuntimePath = require.resolve('@stylable/runtime');
const stylableCorePath = require.resolve('@stylable/core');
const { version: runtimeVersion } = require('@stylable/runtime/package.json') as {
    version: string;
};
const { version: coreVersion } = require('@stylable/core/package.json') as { version: string };

function getCacheKey(
    fileData: string,
    filename: string,
    configString: string,
    options?: { instrument: boolean }
) {
    return (
        fileData +
        configString +
        (options && options.instrument ? 'instrument' : '') +
        filename +
        stylableRuntimePath +
        runtimeVersion +
        stylableCorePath +
        coreVersion
    );
}

export interface StylableJestConfig {
    stylable?: Partial<StylableConfig>;
    configPath?: string;
}

export const createTransformer = (options?: StylableJestConfig) => {
    let resolveModule;

    try {
        if (options?.configPath && !options.stylable?.resolveModule) {
            const { defaultConfig } = require(options.configPath);

            resolveModule =
                defaultConfig && typeof defaultConfig === 'function'
                    ? defaultConfig(fs).resolveModule
                    : undefined;
        }
    } catch (e) {
        throw new Error(`Failed to load Stylable config from ${options?.configPath}:\n${e}`);
    }

    const moduleFactory = stylableModuleFactory(
        {
            fileSystem: fs,
            requireModule: require,
            projectRoot: '',
            resolveNamespace,
            resolveModule,
            ...options?.stylable,
        },
        // ensure the generated module points to our own @stylable/runtime copy
        // this allows @stylable/jest to be used as part of a globally installed CLI
        { runtimePath: stylableRuntimePath }
    );

    const process = (source: string, path: string) => {
        return { code: moduleFactory(source, path) };
    };

    return {
        process,
        getCacheKey,
        canInstrument: false,
    };
};
