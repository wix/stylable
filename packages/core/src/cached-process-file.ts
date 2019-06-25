export type processFn<T> = (fullpath: string, content: string) => T;

export interface CacheItem<T> {
    value: T;
    stat: { mtime: Date };
}

export interface MinimalFS {
    statSync: (fullpath: string) => { mtime: Date };
    readFileSync: (fullpath: string, encoding: 'utf8') => string;
}

export interface FileProcessor<T> {
    process: (fullpath: string, ignoreCache?: boolean, context?: string) => T;
    add: (fullpath: string, value: T) => void;
    processContent: (content: string, fullpath: string) => T;
    cache: Record<string, CacheItem<T>>;
    postProcessors: Array<(value: T, path: string) => T>;
    fs: MinimalFS;
}

export function cachedProcessFile<T = any>(
    processor: processFn<T>,
    fs: MinimalFS,
    resolvePath: (context: string | undefined, path: string) => string
): FileProcessor<T> {
    const cache: { [key: string]: CacheItem<T> } = {};
    const postProcessors: Array<(value: T, path: string) => T> = [];

    function process(fullpath: string, ignoreCache: boolean = false, context?: string) {
        const resolvedPath = resolvePath(context, fullpath);
        const stat = fs.statSync(resolvedPath);
        const cached = cache[resolvedPath];
        if (
            ignoreCache ||
            !cached ||
            (cached && cached.stat.mtime.valueOf() !== stat.mtime.valueOf())
        ) {
            const content = fs.readFileSync(resolvedPath, 'utf8');
            const value = processContent(content, resolvedPath);

            cache[resolvedPath] = { value, stat: { mtime: stat.mtime } };
        }
        return cache[resolvedPath].value;
    }

    function processContent(content: string, filePath: string): T {
        return postProcessors.reduce<T>((value, postProcessor) => {
            return postProcessor(value, filePath);
        }, processor(filePath, content));
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
                mtime
            }
        };
    }

    return {
        processContent,
        postProcessors,
        cache,
        process,
        add,
        fs
    };
}
