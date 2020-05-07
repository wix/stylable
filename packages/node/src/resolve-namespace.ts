import { packageNamespaceFactory } from '@stylable/core';
import { dirname, relative } from 'path';
import findConfig from 'find-config';

export function resolveNamespaceFactory(hashSalt: string = '', prefix: string = '') {
    return packageNamespaceFactory(findConfig, require, { dirname, relative }, hashSalt, prefix);
}

export const resolveNamespace = resolveNamespaceFactory();
