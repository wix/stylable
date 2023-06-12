const timers: Record<string, number> = {};
const counters: Record<string, number> = {};

(globalThis as any).stylable_debug = () => {
    console.log('Timers:');
    for (const [name, time] of Object.entries(timers)) {
        console.log(`  ${name}: ${time.toFixed(2)}ms`);
    }
    console.log('Counters:');
    for (const [name, count] of Object.entries(counters)) {
        console.log(`  ${name}: ${count}`);
    }
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
