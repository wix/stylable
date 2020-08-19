import { dirname } from 'path';
import deindent from 'deindent';
import { MinimalFS } from './cached-process-file';

export interface File {
    content: string;
    mtime?: Date;
}
export interface MinimalFSSetup {
    files: { [absolutePath: string]: File };
    trimWS?: boolean;
}

export function createMinimalFS({ files, trimWS }: MinimalFSSetup) {
    const creationDate = new Date();
    const filePaths = new Map<string, { content: string; mtime: Date }>(
        Object.entries(files).map(([filePath, { content, mtime = creationDate }]) => [
            filePath,
            { content, mtime },
        ])
    );
    const directoryPaths = new Set<string>();
    for (const filePath of filePaths.keys()) {
        for (const directoryPath of getParentPaths(dirname(filePath))) {
            directoryPaths.add(directoryPath);
        }
    }

    const fs: MinimalFS = {
        readFileSync(path: string) {
            if (!files[path]) {
                throw new Error('Cannot find file: ' + path);
            }
            if (trimWS) {
                return deindent(files[path].content).trim();
            }
            return files[path].content;
        },
        statSync(path: string) {
            const isDirectory = directoryPaths.has(path);
            const fileEntry = filePaths.get(path);

            if (!fileEntry && !isDirectory) {
                throw new Error(`ENOENT: no such file or directory, stat ${path}`);
            }

            return {
                isDirectory() {
                    return isDirectory;
                },
                isFile() {
                    return !!fileEntry;
                },
                mtime: fileEntry ? fileEntry.mtime : new Date(),
            };
        },
        readlinkSync() {
            throw new Error(`not implemented`);
        },
    };

    const requireModule = function require(id: string): any {
        const _module = {
            id,
            exports: {},
        };
        try {
            if (!id.match(/\.js$/)) {
                id += '.js';
            }
            // eslint-disable-next-line @typescript-eslint/no-implied-eval
            const fn = new Function('module', 'exports', 'require', files[id].content);
            fn(_module, _module.exports, requireModule);
        } catch (e) {
            throw new Error('Cannot require file: ' + id);
        }
        return _module.exports;
    };

    function resolvePath(_ctx: string, path: string) {
        return path;
    }

    return {
        fs,
        requireModule,
        resolvePath,
    };
}

function getParentPaths(initialDirectoryPath: string) {
    const parentPaths: string[] = [];

    let currentPath = initialDirectoryPath;
    let lastPath: string | undefined;

    while (currentPath !== lastPath) {
        parentPaths.push(currentPath);
        lastPath = currentPath;
        currentPath = dirname(currentPath);
    }

    return parentPaths;
}
