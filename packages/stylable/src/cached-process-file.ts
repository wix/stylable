import { Pojo } from './types';

export type processFn<T> = (fullpath: string, content: string) => T;

export interface CacheItem<T> {
    value: T;
    stat: { mtime: Date };
}

export interface MinimalFS {
    statSync: (fullpath: string) => { mtime: Date };
    readFileSync: (fullpath: string, encoding: string) => string;
}

export interface FileProcessor<T> {
    process: (fullpath: string) => T;
    add: (fullpath: string, value: T) => void;
    processContent: (content: string, fullpath: string) => T;
    cache: Pojo<CacheItem<T>>;
    postProcessors: Array<(value: T, path: string) => T>;
}

export function cachedProcessFile<T = any>(
    processor: processFn<T>,
    fs: MinimalFS,
    resolvePath: (path: string) => string
): FileProcessor<T> {
    const cache: { [key: string]: CacheItem<T> } = {};
    const postProcessors: Array<(value: T, path: string) => T> = [];

    function process(fullpath: string, ignoreCache: boolean = false) {
        const resolvedPath = resolvePath(fullpath);
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
        const resolved = resolvePath(fullpath);
        cache[resolved] = {
            value,
            stat: {
                mtime: fs.statSync(resolved).mtime
            }
        };
    }

    return {
        processContent,
        postProcessors,
        cache,
        process,
        add
    };
}
