import type { StylableConfig } from '@stylable/core';
import { validateDefaultConfig } from '@stylable/core/dist/index-internal';
import { stylableModuleFactory } from '@stylable/module-utils';
import fs from 'fs';
import { defaultStylableMatcher } from './common';
import { resolveNamespace } from './resolve-namespace';

export interface Options {
    matcher: (filename: string) => boolean;
    stylableConfig: Partial<StylableConfig>;
    afterCompile?: (code: string, filename: string) => string;
    runtimePath?: string;
    ignoreJSModules?: boolean;
    configPath?: string;
}

const HOOK_EXTENSION = '.css';

export function attachHook({
    matcher,
    afterCompile,
    stylableConfig,
    runtimePath,
    ignoreJSModules,
    configPath,
}: Partial<Options> = {}) {
    let options: Partial<StylableConfig> = {
        ...stylableConfig,
    };

    try {
        if (configPath) {
            const { defaultConfig } = require(configPath);
            const defaultConfigObj = defaultConfig(fs);

            validateDefaultConfig(defaultConfigObj);

            options = { ...defaultConfigObj, ...options };
        }
    } catch (e) {
        throw new Error(`Failed to load Stylable config from ${configPath}:\n${e}`);
    }

    const stylableToModule = stylableModuleFactory(
        {
            projectRoot: 'root',
            fileSystem: fs,
            requireModule: require,
            resolveNamespace,
            resolverCache: new Map(),
            ...options,
        },
        { runtimePath }
    );

    if (!matcher) {
        matcher = defaultStylableMatcher;
    }

    const prevHook = require.extensions[HOOK_EXTENSION];
    require.extensions[HOOK_EXTENSION] = function cssModulesHook(m: any, filename: string) {
        if (matcher!(filename) || !prevHook) {
            const useJSModule = !ignoreJSModules && fs.existsSync(filename + '.js');
            const source = fs.readFileSync(useJSModule ? filename + '.js' : filename).toString();
            const code = useJSModule ? source : stylableToModule(source, filename);
            return m._compile(afterCompile ? afterCompile(code, filename) : code, filename);
        } else if (prevHook) {
            return prevHook(m, filename);
        } else {
            throw new Error(
                `Failed to load file: ${filename}. Could not find require extension for .css`
            );
        }
    };
}
