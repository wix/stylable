const deindent = require('deindent');
import {resolve} from 'path';

import {MinimalFS} from './cached-process-file';

export interface File {
    content: string;
    mtime?: Date;
}
export interface MinimalFSSetup {
    files: {[absolutePath: string]: File};
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
            if (!files[path]) {
                throw new Error('Cannot find file: ' + path);
            }
            return {
                mtime: files[path].mtime!
            };
        }
    };

    const requireModule = function require(path: string): any {
        const _module = {
            id: path,
            exports: {}
        };
        try {
            if (!path.match(/\.js$/)) {
                path += '.js';
            }
            const fn = new Function('module', 'exports', 'require', files[path].content);
            fn(_module, _module.exports, requireModule);
        } catch (e) {
            throw new Error('Cannot require file: ' + path);
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
