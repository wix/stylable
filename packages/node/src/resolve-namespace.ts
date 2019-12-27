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

export function noCollisionNamespace({
    prefix = '',
    used: usedNamespaces = new Map<
        string,
        { prefix: string; namespace: string; stylesheetPath: string }
    >()
} = {}): typeof resolveNamespace {
    return (namespace, stylesheetPath) => {
        const ns = prefix + namespace;
        const used = usedNamespaces.get(ns);
        if (used) {
            if (used.stylesheetPath !== stylesheetPath) {
                throw new Error(`namespace (${ns} of ${stylesheetPath}) is already in use`);
            }
        } else {
            usedNamespaces.set(ns, { prefix, namespace, stylesheetPath });
        }
        return ns;
    };
}

export const resolveNamespace = resolveNamespaceFactory();
