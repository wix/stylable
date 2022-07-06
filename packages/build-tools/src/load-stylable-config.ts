import findConfig from 'find-config';

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
