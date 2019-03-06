import { StylableConfig } from '@stylable/core';
import { stylableModuleFactory } from '@stylable/module-utils';
import * as fs from 'fs';
import { resolveNamespace } from './resolve-namespace';

export interface Options {
    matcher: (filename: string) => boolean;
    stylableConfig: Partial<StylableConfig>;
    afterCompile?: (code: string, filename: string) => string;
    runtimePath?: string;
}

const HOOK_EXTENSION = '.css';

const defaultStylableMatcher = (filename: string) => !!filename.match(/\.st\.css$/);

export function attachHook({ matcher, afterCompile, stylableConfig, runtimePath }: Partial<Options> = {}) {
    const stylableToModule = stylableModuleFactory({
        projectRoot: 'root',
        fileSystem: fs,
        requireModule: require,
        resolveNamespace,
        ...stylableConfig
    }, { runtimePath });

    if (!matcher) {
        matcher = defaultStylableMatcher;
    }

    const prevHook = require.extensions[HOOK_EXTENSION];
    require.extensions[HOOK_EXTENSION] = function cssModulesHook(m: any, filename: string) {
        if (matcher!(filename) || !prevHook) {
            const source = fs.readFileSync(filename).toString();
            const code = stylableToModule(source, filename);
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
