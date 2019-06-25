import { createMemoryFs } from '@file-services/memory';
import { createRequestResolver } from '@file-services/resolve';

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

    const fs = createMemoryFs();
    for (const [filePath, { content }] of Object.entries(files)) {
        fs.ensureDirectorySync(fs.dirname(filePath));
        fs.writeFileSync(filePath, content);
    }


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

    const resolveRequest = createRequestResolver({ fs });

    return {
        fs,
        requireModule,
        resolveFrom: (context: string | undefined, request: string) => {
            const resolved = resolveRequest(context || fs.cwd(), request);
            return resolved === undefined ? request : resolved.resolvedFile;
        }
    };
}
