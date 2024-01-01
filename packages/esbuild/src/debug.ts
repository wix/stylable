const timers: Record<string, number> = {};
const counters: Record<string, number> = {};

(globalThis as any).stylable_debug = () => {
    console.log('Counters:');
    console.table(counters);
    console.log('Timers:');
    console.table(timers);
    console.log(
        'Total time:',
        Object.values(timers)
            .reduce((a, b) => a + b, 0)
            .toFixed(2),
        'ms'
    );
};

(globalThis as any).stylable_debug_clear = () => {
    for (const key of Object.keys(timers)) {
        timers[key] = 0;
    }
    for (const key of Object.keys(counters)) {
        counters[key] = 0;
    }
};

export function wrapDebug<T extends any[], R>(name: string, fn: (...args: T) => R) {
    if (process.env.STYLABLE_DEBUG !== 'true') {
        return fn;
    }
    return (...args: T) => {
        inc(name);
        const stop = start(name);
        try {
            return fn(...args);
        } finally {
            stop();
        }
    };
}

function inc(name: string) {
    counters[name] ??= 0;
    counters[name]++;
}

function start(name: string) {
    timers[name] ??= 0;
    const start = performance.now();
    return () => {
        timers[name] += performance.now() - start;
    };
}
