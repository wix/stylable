export type processFn<T> = (fullpath: string, content: string) => T;

export interface CacheItem<T> {
    content: string, value: T, stat: { mtime: Date }
}

export interface MinimalFS {
    statSync: (fullpath: string) => { mtime: Date },
    readFileSync: (fullpath: string, encoding: string) => string
}

export function cachedProcessFile<T = any>(process: processFn<T>, fs: MinimalFS): (fullpath: string) => T {
    var cache: { [key: string]: CacheItem<T> } = {};
    return function (fullpath: string) {
        var stat = fs.statSync(fullpath);
        var cached = cache[fullpath];
        if (!cached || (cached && cached.stat.mtime.valueOf() !== stat.mtime.valueOf())) {
            var content = fs.readFileSync(fullpath, 'utf8');
            var value = process(fullpath, content);
            cache[fullpath] = { content, value, stat };
        }
        return cache[fullpath].value;
    }
}