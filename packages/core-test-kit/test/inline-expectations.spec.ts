import {
    generateStylableRoot,
    testInlineExpects,
    testInlineExpectsErrors,
} from '@stylable/core-test-kit';
import { expect } from 'chai';

describe('inline-expectations', () => {
    it('should throw when no tests are found', () => {
        const result = generateStylableRoot({
            entry: `/style.st.css`,
            files: {
                '/style.st.css': {
                    namespace: 'entry',
                    content: `
                        .root {}
                    `,
                },
            },
        });

        expect(() => testInlineExpects(result)).to.throw(testInlineExpectsErrors.noTestsFound());
    });
    it('should throw when expected amount is not found (manual)', () => {
        const result = generateStylableRoot({
            entry: `/style.st.css`,
            files: {
                '/style.st.css': {
                    namespace: 'entry',
                    content: `
                        /* @check .entry__root*/
                        .root {}
                    `,
                },
            },
        });

        expect(() => testInlineExpects(result, 5)).to.throw(
            testInlineExpectsErrors.matchAmount(5, 1)
        );
    });
    it('should throw when expected amount is not found (auto)', () => {
        const result = generateStylableRoot({
            entry: `/style.st.css`,
            files: {
                '/style.st.css': {
                    namespace: 'entry',
                    content: `
                        /* @check */
                        .root {}
                    `,
                },
            },
        });

        expect(() => testInlineExpects(result)).to.throw(testInlineExpectsErrors.matchAmount(1, 0));
    });
    it('should support `@` in expectation', () => {
        const result = generateStylableRoot({
            entry: `/style.st.css`,
            files: {
                '/style.st.css': {
                    namespace: 'entry',
                    content: `
                        /* @check .entry__before\\@after-x */
                        .before\\@after {}
                    `,
                },
            },
        });

        expect(() => testInlineExpects(result)).to.throw(
            testInlineExpectsErrors.selector(`.entry__before\\@after-x`, `.entry__before\\@after`)
        );
    });
    describe(`@rule`, () => {
        it('should throw for unexpected selector', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            /* @rule .otherNamespace__root*/
                            .root {}
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.selector(`.otherNamespace__root`, `.entry__root`)
            );
        });
        it('should throw for unexpected declarations', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            /* @rule .entry__root {color: green;}*/
                            .root {
                                color: red;
                            }
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.declarations(`color: green`, `color: red`, `.entry__root`)
            );
        });
        it('should throw for unexpected declarations (multiple variations)', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            /* @rule .entry__multi {color: green; width: 1px}*/
                            .multi {
                                color: green;
                                width: 2px;
                            }
                            /* @rule .entry__order {width: 2px; color: green;}*/
                            .order {
                                color: green;
                                width: 2px;
                            }
                            /* @rule .entry__multiline {
                                color: red;
                                width: 2px;
                            }*/
                            .multiline {
                                color: green;
                                width: 1px;
                            }
                            /* @rule(only prop) .entry__malformed {color:}*/
                            .malformed {}
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.combine([
                    testInlineExpectsErrors.declarations(
                        `color: green; width: 1px`,
                        `color: green; width: 2px`,
                        `.entry__multi`
                    ),
                    testInlineExpectsErrors.declarations(
                        `width: 2px; color: green`,
                        `color: green; width: 2px`,
                        `.entry__order`
                    ),
                    testInlineExpectsErrors.declarations(
                        `color: red; width: 2px`,
                        `color: green; width: 1px`,
                        `.entry__multiline`
                    ),
                    testInlineExpectsErrors.malformedDecl(
                        `color:`,
                        `(only prop) .entry__malformed {color:}`
                    ),
                ])
            );
        });
        it('should throw for mismatch on nested rules', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            @keyframes anim {
                                /* @rule 50%*/
                                100% {}
                            }
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.selector(`50%`, `100%`)
            );
        });
        it('should throw for mixed-in rules', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            /* 
                                @rule .entry__root 
                                @rule[1] .entry__root:focus
                            */
                            .root {
                                -st-mixin: mix;
                            }
    
                            .mix {}
                            .mix:hover {}
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.selector(`.entry__root:focus`, `.entry__root:hover`)
            );
        });
        it('should throw for missing mixed-in rules', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            /* 
                                @rule .entry__root 
                                @rule[10] .entry__root:focus
                            */
                            .root {
                                -st-mixin: mix;
                            }
                            /*comment to break search after index over 1*/
    
                            .mix {}
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.unfoundMixin(`[10] .entry__root:focus`)
            );
        });
        it(`should throw on none supported mixed-in node type`, () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            /* @rule[1] unsupported */
                            .root {}
                            @mix {}
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.unsupportedMixinNode(`atrule`)
            );
        });
        it('should add label to thrown miss matches', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            /* @rule(only selector) .entry__onlySelector*/
                            .onlySelectorXXX {}
                            /* @rule(declarations) .entry__decls {color: green;}*/
                            .decls {color: red;}
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.combine([
                    testInlineExpectsErrors.selector(
                        `.entry__onlySelector`,
                        `.entry__onlySelectorXXX`,
                        `(only selector): `
                    ),
                    testInlineExpectsErrors.declarations(
                        `color: green`,
                        `color: red`,
                        `.entry__decls`,
                        `(declarations): `
                    ),
                ])
            );
        });
    });
    describe(`@atrule`, () => {
        it('should throw for at rules params', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            /* @atrule entry__anim */
                            @keyframes animX {}
    
                            /* @atrule(no body) "no-body" */
                            @charset "utf-8";
    
                            /* @atrule(complex) screen and (min-width: 8px) */
                            @media screen and (min-width: 900px) {
                                article {
                                  padding: 1rem 3rem;
                                }
                            }
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.combine([
                    testInlineExpectsErrors.atruleParams(`entry__anim`, `entry__animX`),
                    testInlineExpectsErrors.atruleParams(`"no-body"`, `"utf-8"`, `(no body): `),
                    testInlineExpectsErrors.atruleParams(
                        `screen and (min-width: 8px)`,
                        `screen and (min-width: 900px)`,
                        `(complex): `
                    ),
                ])
            );
        });
        it('should throw for mixed-in rules (unsupported)', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            /* @atrule[16] entry__anim */
                            @keyframes animX {}
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.atRuleMultiTest(`[16] entry__anim`)
            );
        });
        it(`should throw on none @atrule`, () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            /* @atrule unsupported*/
                            .root {}
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.unsupportedNode(`@atrule`, `rule`)
            );
        });
    });
    describe(`@check`, () => {
        it(`should proxy to @rule and @atrule`, () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            /* @check .otherNamespace__root*/
                            .root {}

                            /* @check entry__anim */
                            @keyframes animX {}
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.combine([
                    testInlineExpectsErrors.selector(`.otherNamespace__root`, `.entry__root`),
                    testInlineExpectsErrors.atruleParams(`entry__anim`, `entry__animX`),
                ])
            );
        });
        it(`should throw on none @rule or @atrule`, () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            .root {
                                /* @check unsupported*/
                                decl: val;
                            }
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.unsupportedNode(`@check`, `decl`)
            );
        });
    });
});
