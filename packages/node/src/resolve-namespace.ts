import { packageNamespaceFactory, defaultBuildNamespace } from '@stylable/core';
import { dirname, relative } from 'path';
import findConfig from 'find-config';

export function resolveNamespaceFactory(
    hashSalt = '',
    prefix = '',
    buildNamespace = defaultBuildNamespace
): ReturnType<typeof packageNamespaceFactory> {
    return packageNamespaceFactory(
        findConfig,
        require,
        { dirname, relative },
        hashSalt,
        prefix,
        undefined,
        buildNamespace
    );
}

export const resolveNamespace: ReturnType<typeof packageNamespaceFactory> =
    resolveNamespaceFactory();
