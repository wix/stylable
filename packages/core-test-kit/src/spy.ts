// type FuncParameters<F> = F extends (...args: any[]) => any ? Parameters<F> : never;

export const spyCalls = <T, N extends keyof T>(target: T, funcName: N) => {
    const origin = target[funcName];

    if (typeof origin !== 'function') {
        throw new Error('spy only supports functions');
    }

    // proxy
    const logFunc = logCalls(origin);
    target[funcName] = logFunc as T[N];

    return {
        calls: logFunc.calls,
        resetSpy: logFunc.resetHistory,
        restoreSpy() {
            target[funcName] = origin;
        },
    };
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function logCalls<T extends Function>(fn?: T) {
    const spy = (...args: any[]) => {
        spy.calls.push(args);
        spy.callCount++;
        return fn?.(...args);
    };
    spy.calls = [] as unknown[][];
    spy.callCount = 0;
    spy.resetHistory = () => {
        spy.calls.length = 0;
        spy.callCount = 0;
    };
    return spy;
}
