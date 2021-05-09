import findConfig from 'find-config';

export function loadStylableConfig<T>(context: string, extract: (config: any) => T): T | undefined {
    const path = findConfig('stylable.config.js', { cwd: context });
    let config;
    if (path) {
        try {
            config = require(path);
        } catch (e) {
            throw new Error(`Failed to load "stylable.config.js" from ${path}\n${e.stack}`);
        }
        if (!config) {
            throw new Error(
                `Stylable configuration loaded from ${path} but no exported configuration found`
            );
        }
        return extract(config);
    }
    return undefined;
}
