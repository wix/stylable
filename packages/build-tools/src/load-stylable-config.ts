import findConfig from 'find-config';
import { pathToFileURL } from 'url';

export function loadStylableConfig<T>(
    context: string,
    extract: (config: any) => T
): { path: string; config: T } | undefined {
    const path =
        findConfig('stylable.config.js', { cwd: context }) ??
        findConfig('stylable.config.cjs', { cwd: context });
    let config;
    if (path) {
        try {
            config = require(path);
        } catch (e) {
            throw new Error(
                `Failed to load "stylable.config.js" from ${path}\n${(e as Error)?.stack}`
            );
        }
        if (!config) {
            throw new Error(
                `Stylable configuration loaded from ${path} but no exported configuration found`
            );
        }
        return {
            path,
            config: extract(config),
        };
    }
    return undefined;
}

// use eval to preserve esm import from typescript compiling
// it to require, because of our current build to cjs
const esmImport: (url: URL) => any = eval(`(path) => import(path)`);

export async function loadStylableConfigEsm<T>(
    context: string,
    extract: (config: any) => T
): Promise<{ path: string; config: T } | undefined> {
    const path =
        findConfig('stylable.config.js', { cwd: context }) ??
        findConfig('stylable.config.mjs', { cwd: context });
    let config;
    if (path) {
        try {
            config = await esmImport(pathToFileURL(path));
        } catch (e) {
            throw new Error(
                `Failed to load "stylable.config.js" from ${path}\n${(e as Error)?.stack}`
            );
        }
        if (!config) {
            throw new Error(
                `Stylable configuration loaded from ${path} but no exported configuration found`
            );
        }
        return {
            path,
            config: extract(config),
        };
    }
    return undefined;
}
