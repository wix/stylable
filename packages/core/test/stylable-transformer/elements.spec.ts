import { generateStylableRoot, testInlineExpects } from '@stylable/core-test-kit';

describe('Stylable transform elements', () => {
    describe('scoped elements', () => {
        it('component/tag selector with first Capital letter automatically extends reference with identical name', () => {
            const root = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: `
                            :import {
                                -st-from: "./imported.st.css";
                                -st-default: Element;
                            }
                            /* @check .ns1__root */
                            Element {}
                            /* @check .ns__root .ns1__root */
                            .root Element {}
                        `,
                    },
                    '/imported.st.css': {
                        namespace: 'ns1',
                        content: ``,
                    },
                },
            });

            testInlineExpects(root);
        });

        it('component/tag selector with first Capital letter automatically extend reference with identical name (inner parts)', () => {
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

        it('resolve imported element that is also root', () => {
            const root = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: `
                            :import {
                                -st-from: "./imported.st.css";
                                -st-named: ButtonX;
                            }
                            /* @check .ns__x */
                            .x {
                                -st-extends: ButtonX;
                            }
                        `,
                    },
                    '/imported.st.css': {
                        namespace: 'ns1',
                        content: `
                            :import {
                                -st-from: "./button-x.st.css";
                                -st-default: ButtonX;
                            }
                            ButtonX{}
                        `,
                    },
                    '/button-x.st.css': {
                        namespace: 'button-x',
                        content: ``,
                    },
                },
            });
            testInlineExpects(root);
        });

        it('should resolve imported named element type when used as element', () => {
            const root = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-named: Element;
                            }
                            /* @check .base__root */
                            Element {}
                        `,
                    },
                    '/inner.st.css': {
                        namespace: 'inner',
                        content: `
                            :import {
                                -st-from: "./base.st.css";
                                -st-default: Element;
                            }
                            Element {}
                        `,
                    },
                    '/base.st.css': {
                        namespace: 'base',
                        content: `
                            .root {}
                        `,
                    },
                },
            });
            testInlineExpects(root);
        });
    });
});
