import { expectTransformOutput } from '@stylable/core-test-kit';

describe('Stylable transform elements', () => {
    describe('scoped elements', () => {
        it('component/tag selector with first Capital letter automatically extends reference with identical name', () => {
            expectTransformOutput(
                {
                    entry: `/style.st.css`,
                    files: {
                        '/style.st.css': {
                            namespace: 'ns',
                            content: `
                            :import {
                                -st-from: "./imported.st.css";
                                -st-default: Element;
                            }
                            /* @expect .ns1__root */
                            Element {}
                            /* @expect .ns__root .ns1__root */
                            .root Element {}
                        `,
                        },
                        '/imported.st.css': {
                            namespace: 'ns1',
                            content: ``,
                        },
                    },
                },
                2
            );
        });

        it('component/tag selector with first Capital letter automatically extend reference with identical name (inner parts)', () => {
            expectTransformOutput(
                {
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Element;
                            }
                            /* @expect .inner__root .inner__part */
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
                },
                1
            );
        });

        it('resolve imported element that is also root', () => {
            expectTransformOutput(
                {
                    entry: `/style.st.css`,
                    files: {
                        '/style.st.css': {
                            namespace: 'ns',
                            content: `
                            :import {
                                -st-from: "./imported.st.css";
                                -st-named: ButtonX;
                            }
                            /* @expect .ns__x */
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
                },
                1
            );
        });

        it('should resolve imported named element type when used as element', () => {
            expectTransformOutput(
                {
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-named: Element;
                            }
                            /* @expect .base__root */
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
                },
                1
            );
        });
    });
});
