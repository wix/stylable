export type processFn<T> = (fullpath: string, content: string) => T;

export interface CacheItem<T> {
    value: T, stat: { mtime: Date }
}

export interface MinimalFS {
    statSync: (fullpath: string) => { mtime: Date },
    readFileSync: (fullpath: string, encoding: string) => string
}

export interface FileProcessor<T> {
    process: (fullpath: string) => T;
    add: (fullpath: string, value: T) => void;
}

export function cachedProcessFile<T = any>(processor: processFn<T>, fs: MinimalFS): FileProcessor<T> {
    const cache: { [key: string]: CacheItem<T> } = {};

    const process = function (fullpath: string, ignoreCache: boolean = false) {
        var stat = fs.statSync(fullpath);
        var cached = cache[fullpath];
        if (ignoreCache || !cached || (cached && cached.stat.mtime.valueOf() !== stat.mtime.valueOf())) {
            var content = fs.readFileSync(fullpath, 'utf8');
            var value = processor(fullpath, content);
            cache[fullpath] = { value, stat };
        }
        return cache[fullpath].value;
    }

    const add = function (fullpath: string, value: T) {
        cache[fullpath] = {
            value,
            stat: fs.statSync(fullpath)
        }
    }

    return {
        process,
        add
    };

}