import {
    createNamespaceStrategy,
    CreateNamespaceOptions,
    defaultNoMatchHandler,
} from '@stylable/core';
import { dirname, relative } from 'path';
import { findPackageJson } from './find-package-json';

export function resolveNamespaceFactory(
    hashSalt = '',
    prefix = '',
    options: Partial<Omit<CreateNamespaceOptions, 'hashSalt' | 'prefix'>> = {}
) {
    return createNamespaceStrategyNode({ hashSalt, prefix, ...options });
}

export const packageJsonLookupCache = new Map<string, string>();

export function createNamespaceStrategyNode(options: Partial<CreateNamespaceOptions> = {}) {
    return createNamespaceStrategy({
        normalizePath(packageRoot: string, stylesheetPath: string) {
            return relative(packageRoot, stylesheetPath).replace(/\\/g, '/');
        },
        getPackageInfo: (stylesheetPath) => {
            const configPath = findPackageJson(
                dirname(stylesheetPath),
                packageJsonLookupCache
            )?.packageJsonPath;
            if (!configPath) {
                throw new Error(`Could not find package.json for ${stylesheetPath}`);
            }
            const config = require(configPath) as { name: string; version: string };
            return {
                name: config.name,
                version: config.version,
                dirPath: dirname(configPath),
            };
        },
        handleNoMatch(strict, ns, stylesheetPath, usedBy) {
            return strict ? defaultNoMatchHandler(strict, ns, stylesheetPath, usedBy) : ns;
        },
        hashSalt: '',
        hashFragment: 'full',
        hashSeparator: '',
        strict: false,
        ...options,
    });
}

export const resolveNamespace = createNamespaceStrategyNode();
