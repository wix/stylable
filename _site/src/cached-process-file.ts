export type processFn<T> = (fullpath: string, content: string) => T;

export interface CacheItem<T> {
    value: T; stat: {mtime: Date};
}

export interface MinimalFS {
    statSync: (fullpath: string) => {mtime: Date};
    readFileSync: (fullpath: string, encoding: string) => string;
}

export interface FileProcessor<T> {
    process: (fullpath: string) => T;
    add: (fullpath: string, value: T) => void;
}

export function cachedProcessFile<T = any>(processor: processFn<T>, fs: MinimalFS): FileProcessor<T> {
    const cache: {[key: string]: CacheItem<T>} = {};

    function process(fullpath: string, ignoreCache: boolean = false) {
        const stat = fs.statSync(fullpath);
        const cached = cache[fullpath];
        if (ignoreCache || !cached || (cached && cached.stat.mtime.valueOf() !== stat.mtime.valueOf())) {
            const content = fs.readFileSync(fullpath, 'utf8');
            const value = processor(fullpath, content);
            cache[fullpath] = {value, stat};
        }
        return cache[fullpath].value;
    }

    function add(fullpath: string, value: T) {
        cache[fullpath] = {
            value,
            stat: fs.statSync(fullpath)
        };
    }

    return {
        process,
        add
    };

}
