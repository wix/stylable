import type { Configuration, RuleSetRule } from 'webpack';

export function applyWebpackConfigStylableExcludes(webpackConfig: Configuration) {
    safelyWalkJSON(webpackConfig.module ?? {}, insertStCssExclude(/\.st\.css$/));
}

function insertStCssExclude(stRegex: RegExp) {
    return (_: string, value: RuleSetRule) => {
        if (typeof value !== 'string' && value && (value.test || value.issuer)) {
            if (
                value.test?.toString().includes('css') ||
                value.issuer?.toString().includes('css')
            ) {
                if (value.exclude && Array.isArray(value.exclude)) {
                    value.exclude.push(stRegex);
                    return false;
                } else if (value.exclude instanceof RegExp) {
                    value.exclude = [value.exclude, stRegex];
                    return false;
                } else if (typeof value.exclude === 'function') {
                    value.exclude = [value.exclude, stRegex];
                    return false;
                } else if (value.exclude) {
                    throw new Error('unknown exclude pattern: ' + value.exclude);
                } else {
                    value.exclude = [stRegex];
                    return false;
                }
            }
        }
        return;
    };
}

function safelyWalkJSON(
    obj: Record<string, any>,
    visitor: (key: string, value: any, path: string[]) => void | boolean,
    path: string[] = [],
    visited = new Set()
) {
    for (const key in obj) {
        const currentPath = [...path, key];
        if (visited.has(obj[key])) {
            continue;
        } else {
            visited.add(obj[key]);
        }
        const res = visitor(key, obj[key], currentPath);
        if (res === false) {
            continue;
        }
        if (typeof obj[key] === 'object') {
            safelyWalkJSON(obj[key], visitor, currentPath, visited);
        }
    }
}

export function bundleServerLibs(config: Configuration, packages: string[], isServer: boolean) {
    let hasError = false;

    if (isServer) {
        if (Array.isArray(config.externals) && config.externals.length === 1) {
            const nextExternal = config.externals[0];

            if (typeof nextExternal === 'function') {
                config.externals = [
                    async (ctx: any, cb: any) => {
                        for (const pack of packages) {
                            if (ctx.request.startsWith(pack)) {
                                return false;
                            }
                        }
                        return nextExternal(ctx, cb);
                    },
                ];
            } else {
                hasError = true;
            }
        } else {
            hasError = true;
        }

        if (hasError) {
            throw new Error(
                'Invalid configuration: expected config.externals to be an Array with a single function. got ' +
                    JSON.stringify(config.externals)
            );
        }
    }
}
