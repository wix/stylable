export interface TimedCacheOptions {
    timeout: number;
    useTimer: boolean;
    createKey: (args: string[]) => string;
}

export function timedCache<T extends (...args: string[]) => string>(
    fn: T,
    { timeout, useTimer, createKey }: TimedCacheOptions
) {
    const cache = new Map();
    let prevTime = Infinity;
    let shouldClean = false;
    const get = (...args: string[]) => {
        if (!shouldClean && useTimer) {
            setTimeout(() => {
                shouldClean = false;
                cache.clear();
            }, timeout);
        }
        shouldClean = true;
        const current = Date.now();
        if (current - prevTime > timeout && !useTimer) {
            cache.clear();
        }
        prevTime = current;
        const key = createKey(args);
        let value;
        if (!cache.has(key)) {
            value = fn(...args);
            cache.set(key, value);
        } else {
            value = cache.get(key);
        }
        return value;
    };

    return {
        get: get as T,
        cache,
    };
}
