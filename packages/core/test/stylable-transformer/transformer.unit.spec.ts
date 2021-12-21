import { expect } from 'chai';
import { createTransformer } from '@stylable/core-test-kit';

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
        const transformer = createTransformer(
            {
                files: {
                    '/entry.st.css': {
                        content: `
                        @st-import Button from "./button.st.css";

                        .root {
                            -st-extends: Button;
                        }

                        .myBtn {
                            -st-mixin: Button;
                        }
                        `,
                    },
                    '/button.st.css': {
                        content: `
                            .root {}
                            .icon {}
                        `,
                    },
                },
            },
            {
                onResolve,
            }
        );

        transformer.transform(transformer.fileProcessor.process('/entry.st.css'));

        expect(onResolve.callCount, 'call resolve only once').to.equal(1);
    });
});
