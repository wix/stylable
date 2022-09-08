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
}

export const createTransformer = (options?: StylableJestConfig) => {
    const moduleFactory = stylableModuleFactory(
        {
            fileSystem: fs,
            requireModule: require,
            projectRoot: '',
            resolveNamespace,
            ...options?.stylable,
        },
        // ensure the generated module points to our own @stylable/runtime copy
        // this allows @stylable/jest to be used as part of a globally installed CLI
        { runtimePath: stylableRuntimePath }
    );

    const process = (source: string, path: string) => {
        const res = new String(moduleFactory(source, path));

        // v28+ Jest transformer API expects a `code` property with the transformed source
        (res as string & { code: string }).code = res.toString();

        return res as string & { code: string };
    };

    return {
        process,
        getCacheKey,
        canInstrument: false,
    };
};
