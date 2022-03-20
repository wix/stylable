import { generateStylableRoot, testInlineExpects } from '@stylable/core-test-kit';

describe('Stylable transform elements', () => {
    describe('scoped elements', () => {
        it('component/tag selector with first Capital letter automatically extend reference with identical name (inner parts)', () => {
            // ToDo: move to css-pseudo-element feature spec
            const root = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Element;
                            }
                            /* @check .inner__root .inner__part */
                            Element::part {}
                        `,
                    },
                    '/inner.st.css': {
                        namespace: 'inner',
                        content: `
                            .part {}
                        `,
                    },
                },
            });
            testInlineExpects(root);
        });
    });
});
