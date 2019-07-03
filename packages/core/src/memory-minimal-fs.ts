import { resolve, sep } from 'path';
const deindent = require('deindent');

import { MinimalFS } from './cached-process-file';

export interface File {
    content: string;
    mtime?: Date;
}
export interface MinimalFSSetup {
    files: { [absolutePath: string]: File };
    trimWS?: boolean;
}

export function createMinimalFS(config: MinimalFSSetup) {
    const files = config.files;

    for (const file in files) {
        if (files[file].mtime === undefined) {
            files[file].mtime = new Date();
            files[resolve(file)] = files[file];
        }
    }
    function isDir(path: string) {
        return Object.keys(files).some(p => {
            return p.startsWith(path[path.length - 1] === sep ? path : path + sep);
        });
    }
    const fs: MinimalFS = {
        readFileSync(path: string) {
            if (!files[path]) {
                throw new Error('Cannot find file: ' + path);
            }
            if (config.trimWS) {
                return deindent(files[path].content).trim();
            }
            return files[path].content;
        },
        statSync(path: string) {
            const isDirectory = isDir(path);
            if (!files[path] && !isDirectory) {
                throw new Error('Cannot find file: ' + path);
            }

            return {
                isDirectory() {
                    return isDirectory;
                },
                isFile() {
                    return true;
                },
                mtime: isDirectory ? new Date() : files[path].mtime!
            };
        }
    };

    const requireModule = function require(id: string): any {
        const _module = {
            id,
            exports: {}
        };
        try {
            if (!id.match(/\.js$/)) {
                id += '.js';
            }
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
        resolvePath
    };
}
