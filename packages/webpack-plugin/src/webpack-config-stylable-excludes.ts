import type { Configuration, RuleSetRule } from 'webpack';

export function applyWebpackConfigStylableExcludes(webpackConfig: Configuration) {
    safelyWalkJSON(webpackConfig.module ?? {}, insertStCssExclude(/\.st\.css$/));
}

export function applyExcludeNextJSExternslLibInNodeTarget(
    config: Configuration,
    packages: Iterable<string>
) {
    if (!isTargetNode(config)) {
        return;
    }
    const nextExternals = getNextJSExternalHandler(config);
    config.externals = [
        async (ctx: { request?: string }) => {
            for (const pkg of packages) {
                if (ctx?.request?.startsWith(pkg)) {
                    return false;
                }
            }
            return nextExternals(ctx);
        },
    ];
}

function isTargetNode(config: Configuration) {
    return (
        (Array.isArray(config.target) && config.target.includes('node')) || config.target === 'node'
    );
}

function getNextJSExternalHandler(config: Configuration) {
    if (
        !(
            Array.isArray(config.externals) &&
            config.externals.length === 1 &&
            typeof config.externals[0] === 'function'
        )
    ) {
        throw new Error(
            'Invalid configuration: expected config.externals to be an Array with a single function. got ' +
                JSON.stringify(config.externals)
        );
    }
    return config.externals[0] as (data: ExternalItemFunctionData) => Promise<any>;
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

/* extracted from webpack */
declare interface ExternalItemFunctionData {
    context?: string;
    getResolve?: (options?: {}) => (context: string, request: string) => Promise<string>;
    request?: string;
}
