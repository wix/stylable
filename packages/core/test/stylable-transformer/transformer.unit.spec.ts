import { expect } from 'chai';
import { testStylableCore } from '@stylable/core-test-kit';

function createSpy<T extends (...args: any[]) => any>(fn?: T) {
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

describe('Transformer', () => {
    it('should not resolve path more then once', () => {
        const onResolve = createSpy((resolved) => resolved);
        testStylableCore(
            {
                '/base.st.css': `
                    :vars {
                        color: green;
                    }
                `,
                '/button.st.css': `
                    @st-import [color] from "./base.st.css";
                    .root {
                        color: value(color);
                    }
                    .icon {
                        background: value(color);
                    }
                `,
                '/entry.st.css': `
                    @st-import Button from "./button.st.css";
                    @st-import [color] from "./base.st.css";

                    .root {
                        -st-extends: Button;
                    }

                    .myBtn {
                        -st-mixin: Button;
                    }
                `,
            },
            {
                stylableConfig: {
                    resolveModule: onResolve,
                    resolverCache: new Map(), // ToDo: v5 this should be default : remove
                },
            }
        );

        expect(onResolve.callCount, 'call resolve only once for each import path').to.equal(2);
    });
});
