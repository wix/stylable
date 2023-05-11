import {
    diagnosticBankReportToStrings,
    shouldReportNoDiagnostics,
    testStylableCore,
} from '@stylable/core-test-kit';
import { STStructure, transformerDiagnostics } from '@stylable/core/dist/index-internal';
import { expect } from 'chai';

const transformerStringDiagnostics = diagnosticBankReportToStrings(transformerDiagnostics);

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
    it('should prevent automatic .class=>::part definition', () => {
        testStylableCore(`
            @st .root;
            .part {}

            /* 
                @transform-error ${transformerStringDiagnostics.UNKNOWN_PSEUDO_ELEMENT(`part`)}
                @rule .entry__root::part
            */
            .root::part {}
        `);
    });
    it('should register css class (top level) + no implicit root', () => {
        const { sheets } = testStylableCore(`
            @st .abc;
            @st .xyz {}
            .normal-class {}
        `);

        const { meta } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);
        expect(meta.getAllClasses()).to.have.keys(['root', 'abc', 'xyz', 'normal-class']);
    });
});
