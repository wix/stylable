import hash from 'murmurhash';
import type { processNamespace } from './stylable-processor';

export function packageNamespaceFactory(
    findConfig: (fileName: string, options: { cwd: string }) => string | null,
    loadConfig: (filePath: string) => object,
    {
        dirname,
        relative,
    }: { dirname(path: string): string; relative(from: string, to: string): string },
    hashSalt = '',
    prefix = '',
    normalizeVersion = (semver: string) => semver
): typeof processNamespace {
    return (namespace: string, stylesheetPath: string) => {
        const configPath = findConfig('package.json', { cwd: dirname(stylesheetPath) });
        if (!configPath) {
            throw new Error(`Could not find package.json for ${stylesheetPath}`);
        }
        const config = loadConfig(configPath) as { name: string; version: string };
        const fromRoot = relative(dirname(configPath), stylesheetPath).replace(/\\/g, '/');
        return (
            prefix +
            namespace +
            hash.v3(
                hashSalt + config.name + '@' + normalizeVersion(config.version) + '/' + fromRoot
            )
        );
    };
}

export function noCollisionNamespace({
    prefix = '',
    used: usedNamespaces = new Map<
        string,
        { prefix: string; namespace: string; stylesheetPath: string }
    >(),
} = {}): typeof processNamespace {
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
