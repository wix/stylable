import { testStylableCore } from '@stylable/core-test-kit';
import { STStructure } from '@stylable/core/dist/index-internal';
import { expect } from 'chai';

type FuncParameters<F> = F extends (...args: any[]) => any ? Parameters<F> : never;

const spy = <T, N extends keyof T>(target: T, funcName: N) => {
    const origin = target[funcName];

    if (typeof origin !== 'function') {
        throw new Error('spy only supports functions');
    }

    // type OriginType = FuncType<typeof origin>;
    type OriginArgs = FuncParameters<typeof origin>;
    const calls: OriginArgs[] = [];

    // proxy
    target[funcName] = ((...args: OriginArgs[]) => {
        // record
        calls.push([...args] as any);
        // call original
        return origin(...args);
    }) as T[N];
    return {
        calls,
        restoreSpy() {
            target[funcName] = origin;
        },
    };
};

describe('@st structure', () => {
    it('should warn experimental feature', () => {
        const { restoreSpy, calls } = spy(console, 'warn');
        const filterExpCalls = () =>
            calls.filter(([msg]) => typeof msg === 'string' && msg === STStructure.experimentalMsg);

        // no warn without using @st
        testStylableCore(`
            .root{}
        `);

        expect(filterExpCalls(), 'not used').to.have.lengthOf(0);

        // reset calls
        calls.length = 0;

        testStylableCore(`
            @st;
            @st;
        `);

        expect(filterExpCalls(), 'only once').to.have.lengthOf(1);

        restoreSpy();
    });
});
