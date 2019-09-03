import { processNamespace } from '@stylable/core';
import hash from 'murmurhash';
import { dirname, join, relative } from 'path';
const findConfig = require('find-config');

export function resolveNamespaceFactory(
    hashSalt: string = '',
    prefix: string = '',
    ignoreManifestInPackges = new Set<string>()
): typeof processNamespace {
    const projectConfig = findConfig.require('package.json', {});
    ignoreManifestInPackges.add(projectConfig.name);
    return (namespace: string, stylesheetPath: string) => {
        const configPath = findConfig('package.json', { cwd: dirname(stylesheetPath) });
        const config = require(configPath);
        const fromRoot = relative(dirname(configPath), stylesheetPath).replace(/\\/g, '/');
        if (!ignoreManifestInPackges.has(config.name)) {
            let manifest;
            if (config.stylable && config.stylable.manifest) {
                try {
                    manifest = require(join(dirname(configPath), config.stylable.manifest));
                } catch {
                    throw new Error(
                        'Could not find manifest at: ' +
                            join(dirname(configPath), config.stylable.manifest)
                    );
                }
            }
            if (manifest && manifest.namespaceMapping && manifest.namespaceMapping[fromRoot]) {
                return manifest.namespaceMapping[fromRoot];
            }
        }
        return (
            prefix +
            namespace +
            hash.v3(hashSalt + config.name + '@' + config.version + '/' + fromRoot)
        );
    };
}

export const resolveNamespace = resolveNamespaceFactory();
