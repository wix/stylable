export type processFn<T> = (fullpath: string, content: string) => T;

export interface CacheItem<T> {
    value: T;
    content: string;
}

export interface MinimalFS {
    statSync: (filePath: string) => { mtime: Date };
    readFileSync: (filePath: string, encoding: 'utf8') => string;
    readlinkSync: (filePath: string) => string;
}

export interface FileProcessor<T> {
    process: (filePath: string, invalidateCache?: boolean) => T;
    add: (filePath: string, value: T) => void;
    processContent: (content: string, filePath: string) => T;
    cache: Record<string, CacheItem<T>>;
    postProcessors: Array<(value: T, path: string) => T>;
}

export function cachedProcessFile<T = any>(
    processor: processFn<T>,
    readFileSync: MinimalFS['readFileSync'],
    postProcessors: Array<(value: T, path: string) => T> = [],
    cache: { [key: string]: CacheItem<T> } = {}
): FileProcessor<T> {
    function process(filePath: string, invalidateCache = false) {
        const content = readFileSync(filePath, 'utf8');
        const cached = cache[filePath];
        if (invalidateCache || !cached || (cached && cached.content !== content)) {
            cache[filePath] = {
                value: processContent(content, filePath),
                content,
            };
        }
        return cache[filePath].value;
    }

    function processContent(content: string, filePath: string): T {
        return postProcessors.reduce<T>(
            (value, postProcessor) => postProcessor(value, filePath),
            processor(filePath, content)
        );
    }

    function add(filePath: string, value: T) {
        let content;
        try {
            content = readFileSync(filePath, 'utf8');
        } catch (e) {
            content = '';
        }
        cache[filePath] = {
            value,
            content,
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
