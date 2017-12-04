export declare type processFn<T> = (fullpath: string, content: string) => T;
export interface CacheItem<T> {
    value: T;
    stat: {
        mtime: Date;
    };
}
export interface MinimalFS {
    statSync: (fullpath: string) => {
        mtime: Date;
    };
    readFileSync: (fullpath: string, encoding: string) => string;
}
export interface FileProcessor<T> {
    process: (fullpath: string) => T;
    add: (fullpath: string, value: T) => void;
}
export declare function cachedProcessFile<T = any>(processor: processFn<T>, fs: MinimalFS): FileProcessor<T>;
