import { expect } from 'chai';
import { testStylableCore, logCalls } from '@stylable/core-test-kit';

describe('Transformer', () => {
    it('should not resolve path more then once', () => {
        const onResolve = logCalls((resolved: any) => resolved);
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
                },
            },
        );

        expect(onResolve.callCount, 'call resolve only once for each import path').to.equal(2);
    });
});
