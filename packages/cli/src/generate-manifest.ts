import type { Stylable } from '@stylable/core';
import { ensureDirectory, tryRun } from './build-tools';
import type { Log } from './logger';
import type { IFileSystem } from '@file-services/types';
import { isAbsolute } from 'path';

export function generateManifest(
    remapPath: (absPath: string) => string,
    filesToBuild: Set<string>,
    manifestOutputPath: string,
    stylable: Stylable,
    mode: string,
    log: Log,
    fs: IFileSystem
) {
    function getExistingMeta(stylable: Stylable, filePath: string) {
        // skip fs check since we should not introduce new files
        return (
            stylable.fileProcessor.cache[filePath]?.value ||
            stylable.fileProcessor.process(filePath)
        );
    }
    const manifest: {
        namespaceMapping: {
            [key: string]: string;
        };
        cssDependencies: {
            [key: string]: string[];
        };
    } = {
        namespaceMapping: {},
        cssDependencies: {},
    };

    for (const filePath of filesToBuild) {
        const meta = getExistingMeta(stylable, filePath);

        const relativePath = remapPath(filePath);
        manifest.namespaceMapping[relativePath] = meta.namespace;
        const shallowDeps = meta.getImportStatements().map(({ from }) => {
            if (isAbsolute(from)) {
                return remapPath(from);
            }
            return from;
        });
        manifest.cssDependencies[relativePath] = shallowDeps;
    }
    log(mode, `Creating manifest file at ${manifestOutputPath}`);
    tryRun(
        () => ensureDirectory(fs.dirname(manifestOutputPath), fs),
        `Ensure directory for manifest: ${manifestOutputPath}`
    );
    tryRun(
        () => fs.writeFileSync(manifestOutputPath, JSON.stringify(manifest)),
        'Write Index File Error'
    );
}
