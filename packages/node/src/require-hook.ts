import { StylableConfig } from '@stylable/core';
import { stylableModuleFactory } from '@stylable/module-utils';
import * as fs from 'fs';
import { resolveNamespace } from './resolve-namespace';

export interface Options {
    matcher: (filename: string) => boolean;
    stylableConfig: Partial<StylableConfig>;
    afterCompile?: (code: string, filename: string) => string;
    runtimePath?: string;
    ignoreJSModules?: boolean;
}

const HOOK_EXTENSION = '.css';

const defaultStylableMatcher = (filename: string) => !!filename.match(/\.st\.css$/);

export function attachHook({
    matcher,
    afterCompile,
    stylableConfig,
    runtimePath,
    ignoreJSModules
}: Partial<Options> = {}) {
    const stylableToModule = stylableModuleFactory(
        {
            projectRoot: 'root',
            fileSystem: fs,
            requireModule: require,
            resolveNamespace,
            ...stylableConfig
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
