import { packageNamespaceFactory } from '@stylable/core';
import { dirname, relative } from 'path';
import findConfig from 'find-config';

export function resolveNamespaceFactory(
    hashSalt = '',
    prefix = ''
): ReturnType<typeof packageNamespaceFactory> {
    return packageNamespaceFactory(findConfig, require, { dirname, relative }, hashSalt, prefix);
}

export const resolveNamespace: ReturnType<typeof packageNamespaceFactory> = resolveNamespaceFactory();
