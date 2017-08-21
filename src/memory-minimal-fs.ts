const deindent = require('deindent');

import { MinimalFS } from "./cached-process-file";

export interface File { content: string; mtime?: Date; }
export interface MinimalFSSetup { files: { [absolutePath: string]: File } }

export function createMinimalFS(config: MinimalFSSetup) {
    const files = config.files;

    for (var file in files) {
        if (files[file].mtime === undefined) {
            files[file].mtime = new Date();
        }
    }

    const fs: MinimalFS = {
        readFileSync(path: string) {
            return deindent(files[path].content).trim()
        },
        statSync(path: string) {
            return {
                mtime: files[path].mtime!
            };
        }
    };

    const requireModule = function require(path: string): any {
        if (!path.match(/\.js$/)) {
            path += '.js';
        }
        const fn = new Function("module", "exports", "require", files[path].content);
        const _module = {
            id: path,
            exports: {}
        }
        fn(_module, _module.exports, requireModule);
        return _module.exports;
    }

    return {
        fs,
        requireModule
    }
}
