import { Stylable } from '@stylable/core';
import { dirname, relative } from 'path';
import { ensureDirectory, tryRun } from './build-tools';
export function generateManifest(
    rootDir: string,
    filesToBuild: string[],
    manifestOutputPath = '',
    stylable: Stylable,
    log: (...args: string[]) => void,
    fs: any
) {
    function getBuildNamespace(stylable: Stylable, filePath: string): string {
        return stylable.fileProcessor.process(filePath).namespace;
    }
    if (manifestOutputPath) {
        const manifest = filesToBuild.reduce<{
            namespaceMapping: {
                [key: string]: string;
            };
        }>(
            (manifest, filePath) => {
                manifest.namespaceMapping[relative(rootDir, filePath)] = getBuildNamespace(
                    stylable,
                    filePath
                );
                return manifest;
            },
            {
                namespaceMapping: {},
            }
        );
        log('[Build]', 'creating manifest file: ');
        tryRun(
            () => ensureDirectory(dirname(manifestOutputPath), fs),
            `Ensure directory for manifest: ${manifestOutputPath}`
        );
        tryRun(
            () => fs.writeFileSync(manifestOutputPath, JSON.stringify(manifest)),
            'Write Index File Error'
        );
    }
}
