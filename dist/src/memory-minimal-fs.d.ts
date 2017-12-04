import { MinimalFS } from './cached-process-file';
export interface File {
    content: string;
    mtime?: Date;
}
export interface MinimalFSSetup {
    files: {
        [absolutePath: string]: File;
    };
    trimWS?: boolean;
}
export declare function createMinimalFS(config: MinimalFSSetup): {
    fs: MinimalFS;
    requireModule: (path: string) => any;
    resolvePath: (_ctx: string, path: string) => string;
};
