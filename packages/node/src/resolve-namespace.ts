import { processNamespace } from '@stylable/core';
import hash from 'murmurhash';
import { dirname, relative } from 'path';
const findConfig = require('find-config');

export function resolveNamespaceFactory(
    hashSalt: string = '',
    prefix: string = ''
): typeof processNamespace {
    return (namespace: string, stylesheetPath: string) => {
        const configPath = findConfig('package.json', { cwd: dirname(stylesheetPath) });
        const config = require(configPath);
        const fromRoot = relative(dirname(configPath), stylesheetPath).replace(/\\/g, '/');
        return (
            prefix +
            namespace +
            hash.v3(hashSalt + config.name + '@' + config.version + '/' + fromRoot)
        );
    };
}

export const resolveNamespace = resolveNamespaceFactory();
