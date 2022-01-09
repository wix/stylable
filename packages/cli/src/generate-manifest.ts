import type { Stylable } from '@stylable/core';
import { dirname, relative } from 'path';
import { ensureDirectory, tryRun } from './build-tools';
import type { Log } from './logger';

export function generateManifest(
    rootDir: string,
    filesToBuild: Set<string>,
    manifestOutputPath: string,
    stylable: Stylable,
    mode: string,
    log: Log,
    fs: any
) {
    function getBuildNamespace(stylable: Stylable, filePath: string): string {
        return stylable.fileProcessor.process(filePath).namespace;
    }
    const manifest = [...filesToBuild].reduce<{
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
    log(mode, 'creating manifest file: ');
    tryRun(
        () => ensureDirectory(dirname(manifestOutputPath), fs),
        `Ensure directory for manifest: ${manifestOutputPath}`
    );
    tryRun(
        () => fs.writeFileSync(manifestOutputPath, JSON.stringify(manifest)),
        'Write Index File Error'
    );
}
