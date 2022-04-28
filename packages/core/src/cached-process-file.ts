export type processFn<T> = (fullpath: string, content: string) => T;

export interface CacheItem<T> {
    value: T;
    stat: { mtime: Date };
}

export interface MinimalFS {
    statSync: (fullpath: string) => { mtime: Date };
    readFileSync: (fullpath: string, encoding: 'utf8') => string;
    readlinkSync: (fullpath: string) => string;
}

export interface FileProcessor<T> {
    process: (fullpath: string, invalidateCache?: boolean) => T;
    add: (fullpath: string, value: T) => void;
    processContent: (content: string, fullpath: string) => T;
    cache: Record<string, CacheItem<T>>;
    postProcessors: Array<(value: T, path: string) => T>;
}

export function cachedProcessFile<T = any>(
    processor: processFn<T>,
    fs: MinimalFS,
    postProcessors: Array<(value: T, path: string) => T> = [],
    cache: { [key: string]: CacheItem<T> } = {}
): FileProcessor<T> {
    function process(fullpath: string, invalidateCache = false) {
        const stat = fs.statSync(fullpath);
        const cached = cache[fullpath];
        if (
            invalidateCache ||
            !cached ||
            (cached && cached.stat.mtime.valueOf() !== stat.mtime.valueOf())
        ) {
            const content = fs.readFileSync(fullpath, 'utf8');
            const value = processContent(content, fullpath);
            cache[fullpath] = { value, stat: { mtime: stat.mtime } };
        }
        return cache[fullpath].value;
    }

    function processContent(content: string, filePath: string): T {
        return postProcessors.reduce<T>(
            (value, postProcessor) => postProcessor(value, filePath),
            processor(filePath, content)
        );
    }

    function add(fullpath: string, value: T) {
        let mtime;
        try {
            mtime = fs.statSync(fullpath).mtime;
        } catch (e) {
            mtime = new Date();
        }
        cache[fullpath] = {
            value,
            stat: {
                mtime,
            },
        };
    }

    return {
        processContent,
        postProcessors,
        cache,
        process,
        add,
    };
}
