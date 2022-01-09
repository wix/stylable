import {
    generateStylableResult,
    generateStylableRoot,
    testInlineExpects,
    testInlineExpectsErrors,
} from '@stylable/core-test-kit';
import { transformerWarnings } from '@stylable/core/dist/stylable-transformer';
import { STImport, CSSType, CSSClass } from '@stylable/core/dist/features';
import { expect } from 'chai';

describe('inline-expectations', () => {
    it('should throw when expected amount is not found (manual)', () => {
        const result = generateStylableResult({
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
        /* simple parse amount of expected tests to compare to the actual run tests
           and throw in case actual tests diff from expected.

           `@check` is used without expectation input which is counted in the simple auto
           expectation, but is not generating an actual test.
        */
        const result = generateStylableResult({
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
        const result = generateStylableResult({
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
            const result = generateStylableResult({
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
            const result = generateStylableResult({
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
            const result = generateStylableResult({
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
                    testInlineExpectsErrors.ruleMalformedDecl(
                        `color:`,
                        `(only prop) .entry__malformed {color:}`
                    ),
                ])
            );
        });
        it('should throw for mismatch on nested rules', () => {
            const result = generateStylableResult({
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
            const result = generateStylableResult({
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
            const result = generateStylableResult({
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
        it(`should support mixed-in atrule`, () => {
            const result = generateStylableResult({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            @st-import Mix from './mix.st.css';

                            /*
                                @rule[1] mixed-params-x
                                @rule(label)[2] mixed-params-y
                            */
                            .root {
                                -st-mixin: Mix;
                            }
                        `,
                    },
                    '/mix.st.css': {
                        namespace: 'mix',
                        content: `
                            @mix mixed-params-a {}
                            @mix mixed-params-b {}
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.combine([
                    testInlineExpectsErrors.atruleParams(`mixed-params-x`, `mixed-params-a`),
                    testInlineExpectsErrors.atruleParams(
                        `mixed-params-y`,
                        `mixed-params-b`,
                        `(label): `
                    ),
                ])
            );
        });
        it(`should throw on none supported mixed-in node type`, () => {
            const result = generateStylableResult({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            /* @rule[1] unsupported */
                            .root {}
                            decl: val;
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.unsupportedMixinNode(`decl`)
            );
        });
        it('should add label to thrown mismatches', () => {
            const result = generateStylableResult({
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
            const result = generateStylableResult({
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
            const result = generateStylableResult({
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
            const result = generateStylableResult({
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
    describe(`@decl`, () => {
        it('should throw for unexpected value', () => {
            const result = generateStylableResult({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            .root {
                                /* @decl color: blue */
                                color: red;
                            }
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.decl(`color: blue`, `color: red`)
            );
        });
        it('should mark error with label', () => {
            const result = generateStylableResult({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            .root {
                                /* @decl(text) color: blue */
                                color: red;
                            }
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.decl(`color: blue`, `color: red`, `(text): `)
            );
        });
        it('should throw on malformed expectation', () => {
            const result = generateStylableResult({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            .root {
                                /* @decl(only prop) color */
                                color: red;

                                /* @decl(missing value) color: */
                                color: red;
                                
                                /* @decl(missing prop) : red */
                                color: red;
                            }
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.combine([
                    testInlineExpectsErrors.declMalformed(`color`, ``, `(only prop): `),
                    testInlineExpectsErrors.declMalformed(`color`, ``, `(missing value): `),
                    testInlineExpectsErrors.declMalformed(``, `red`, `(missing prop): `),
                ])
            );
        });
        it(`should throw on none declaration node`, () => {
            const result = generateStylableResult({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            /* @decl(on rule) color: red*/
                            .root {}
                            
                            /* @decl(on atrule) color: red*/
                            @keyframes a {}
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.combine([
                    testInlineExpectsErrors.unsupportedNode(`@decl`, `rule`, `(on rule): `),
                    testInlineExpectsErrors.unsupportedNode(`@decl`, `atrule`, `(on atrule): `),
                ])
            );
        });
        it('should not throw when valid', () => {
            const result = generateStylableResult({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            .root {
                                /* @decl color: green */
                                color: green;

                                /* @decl(no-spaces)color:green */
                                color: green;
                                
                                /* @decl(all-spaces)  color  :      green */
                                color: green;
                            }
                            
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.not.throw();
        });
    });
    describe(`@analyze`, () => {
        it(`should throw on malformed expectation`, () => {
            const result = generateStylableResult({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            /* @analyze- */
                            .root {}

                            /* @analyze-warn */
                            .root {}
                            
                            /* @analyze-warn(label) */
                            .root {}
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.combine([
                    testInlineExpectsErrors.analyzeMalformed(`-`),
                    testInlineExpectsErrors.analyzeMalformed(`-warn`),
                    testInlineExpectsErrors.analyzeMalformed(`-warn(label)`, `(label): `),
                ])
            );
        });
        it(`should throw for backwards compatibility (@analyze is not supported with just AST root)`, () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            /* @analyze-warn message */
                            .root {}
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.deprecatedRootInputNotSupported(`@analyze-warn message`)
            );
        });
        it(`should not throw when diagnostic is matched`, () => {
            const result = generateStylableResult({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            /* @analyze-warn ${CSSType.diagnostics.UNSCOPED_TYPE_SELECTOR(`div`)} */
                            div {}
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.not.throw();
        });
        it(`should throw on unsupported severity`, () => {
            const result = generateStylableResult({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            /* @analyze-unknown diagnostic message */
                            .root {}

                            /* @analyze-unknown(label) diagnostic message */
                            .root {}
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.combine([
                    testInlineExpectsErrors.diagnosticsUnsupportedSeverity(`analyze`, `unknown`),
                    testInlineExpectsErrors.diagnosticsUnsupportedSeverity(
                        `analyze`,
                        `unknown`,
                        `(label): `
                    ),
                ])
            );
        });
        it(`should throw on possible location mismatch`, () => {
            const result = generateStylableResult({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            /* 
                                @analyze-warn ${CSSType.diagnostics.UNSCOPED_TYPE_SELECTOR(`div`)}
                                @analyze-warn(label) ${CSSType.diagnostics.UNSCOPED_TYPE_SELECTOR(
                                    `div`
                                )}
                            */
                            .root {}

                            div {}
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.combine([
                    testInlineExpectsErrors.diagnosticsLocationMismatch(
                        `analyze`,
                        CSSType.diagnostics.UNSCOPED_TYPE_SELECTOR(`div`)
                    ),
                    testInlineExpectsErrors.diagnosticsLocationMismatch(
                        `analyze`,
                        CSSType.diagnostics.UNSCOPED_TYPE_SELECTOR(`div`),
                        `(label): `
                    ),
                ])
            );
        });
        it(`should throw on word mismatch`, () => {
            const result = generateStylableResult({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                        /* @analyze-warn word(single) ${CSSType.diagnostics.UNSCOPED_TYPE_SELECTOR(
                            `div`
                        )} */
                        div {}
                        
                        /* @analyze-warn(many words) word(one two) ${CSSType.diagnostics.UNSCOPED_TYPE_SELECTOR(
                            `div`
                        )} */
                        div {}
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.combine([
                    testInlineExpectsErrors.diagnosticsWordMismatch(
                        `analyze`,
                        `single`,
                        CSSType.diagnostics.UNSCOPED_TYPE_SELECTOR(`div`)
                    ),
                    testInlineExpectsErrors.diagnosticsWordMismatch(
                        `analyze`,
                        `one two`,
                        CSSType.diagnostics.UNSCOPED_TYPE_SELECTOR(`div`),
                        `(many words): `
                    ),
                ])
            );
        });
        it(`should throw on severity mismatch`, () => {
            const result = generateStylableResult({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                        /* @analyze-error ${CSSType.diagnostics.UNSCOPED_TYPE_SELECTOR(`div`)} */
                        div {}

                        /* @analyze-error(label) ${CSSType.diagnostics.UNSCOPED_TYPE_SELECTOR(
                            `div`
                        )} */
                        div {}
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.combine([
                    testInlineExpectsErrors.diagnosticsSeverityMismatch(
                        `analyze`,
                        `error`,
                        `warning`,
                        CSSType.diagnostics.UNSCOPED_TYPE_SELECTOR(`div`)
                    ),
                    testInlineExpectsErrors.diagnosticsSeverityMismatch(
                        `analyze`,
                        `error`,
                        `warning`,
                        CSSType.diagnostics.UNSCOPED_TYPE_SELECTOR(`div`),
                        `(label): `
                    ),
                ])
            );
        });
        it(`should throw on missing diagnostic`, () => {
            const result = generateStylableResult({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            /* @analyze-warn fake diagnostic message */
                            .root {}
                            
                            /* @analyze-warn(label) fake diagnostic message */
                            .root {}
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.combine([
                    testInlineExpectsErrors.diagnosticExpectedNotFound(
                        `analyze`,
                        `fake diagnostic message`
                    ),
                    testInlineExpectsErrors.diagnosticExpectedNotFound(
                        `analyze`,
                        `fake diagnostic message`,
                        `(label): `
                    ),
                ])
            );
        });
        it(`should check against rawAst (for nodes that are removed in transform)`, () => {
            const result = generateStylableResult({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            /* @analyze-warn word(comp) ${STImport.diagnostics.DEFAULT_IMPORT_IS_LOWER_CASE()} */
                            @st-import comp from "./x.st.css";
                            
                            /* @analyze-warn ${STImport.diagnostics.ST_IMPORT_EMPTY_FROM()} */
                            @st-import comp from "./x.st.css";
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.diagnosticExpectedNotFound(
                    `analyze`,
                    STImport.diagnostics.ST_IMPORT_EMPTY_FROM()
                )
            );
        });
    });
    describe(`@transform`, () => {
        it(`should throw on malformed expectation`, () => {
            const result = generateStylableResult({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            /* @transform- */
                            .root {}

                            /* @transform-warn */
                            .root {}
                            
                            /* @transform-warn(label) */
                            .root {}
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.combine([
                    testInlineExpectsErrors.transformMalformed(`-`),
                    testInlineExpectsErrors.transformMalformed(`-warn`),
                    testInlineExpectsErrors.transformMalformed(`-warn(label)`, `(label): `),
                ])
            );
        });
        it(`should throw for backwards compatibility (@transform is not supported with just AST root)`, () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            /* @transform-warn message */
                            .root {}
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.deprecatedRootInputNotSupported(`@transform-warn message`)
            );
        });
        it(`should not throw when diagnostic is matched`, () => {
            const result = generateStylableResult({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                        @st-import [unknown] from './other.st.css';

                        .root {
                            /* @transform-error ${CSSClass.diagnostics.CANNOT_EXTEND_UNKNOWN_SYMBOL(
                                `unknown`
                            )}*/
                            -st-extends: unknown;
                        }
                        `,
                    },
                    '/other.st.css': {
                        namespace: 'other',
                        content: ``,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.not.throw();
        });
        it(`should throw on unsupported severity`, () => {
            const result = generateStylableResult({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            /* @transform-unknown diagnostic message */
                            .root {}

                            /* @transform-unknown(label) diagnostic message */
                            .root {}
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.combine([
                    testInlineExpectsErrors.diagnosticsUnsupportedSeverity(`transform`, `unknown`),
                    testInlineExpectsErrors.diagnosticsUnsupportedSeverity(
                        `transform`,
                        `unknown`,
                        `(label): `
                    ),
                ])
            );
        });
        it(`should throw on possible location mismatch`, () => {
            const result = generateStylableResult({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            @st-import [unknown] from './unknown.st.css';

                            /* 
                                @transform-warn ${STImport.diagnostics.UNKNOWN_IMPORTED_FILE(
                                    `./unknown.st.css`
                                )}
                                @transform-warn(label) ${STImport.diagnostics.UNKNOWN_IMPORTED_FILE(
                                    `./unknown.st.css`
                                )}
                            */
                            .root {}
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.combine([
                    testInlineExpectsErrors.diagnosticsLocationMismatch(
                        `transform`,
                        STImport.diagnostics.UNKNOWN_IMPORTED_FILE(`./unknown.st.css`)
                    ),
                    testInlineExpectsErrors.diagnosticsLocationMismatch(
                        `transform`,
                        STImport.diagnostics.UNKNOWN_IMPORTED_FILE(`./unknown.st.css`),
                        `(label): `
                    ),
                ])
            );
        });
        it(`should throw on word mismatch`, () => {
            const result = generateStylableResult({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                        /* @transform-warn word(something-else) ${transformerWarnings.UNKNOWN_PSEUDO_ELEMENT(
                            `not-a-real-thing`
                        )} */
                        .root::not-a-real-thing {}
                        
                        /* @transform-warn(many) word(a b c) ${transformerWarnings.UNKNOWN_PSEUDO_ELEMENT(
                            `not-a-real-thing`
                        )} */
                        .root::not-a-real-thing {}
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.combine([
                    testInlineExpectsErrors.diagnosticsWordMismatch(
                        `transform`,
                        `something-else`,
                        transformerWarnings.UNKNOWN_PSEUDO_ELEMENT(`not-a-real-thing`)
                    ),
                    testInlineExpectsErrors.diagnosticsWordMismatch(
                        `transform`,
                        `a b c`,
                        transformerWarnings.UNKNOWN_PSEUDO_ELEMENT(`not-a-real-thing`),
                        `(many): `
                    ),
                ])
            );
        });
        it(`should throw on severity mismatch`, () => {
            const result = generateStylableResult({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                        /* @transform-info ${transformerWarnings.UNKNOWN_PSEUDO_ELEMENT(
                            `not-a-real-thing`
                        )} */
                        .root::not-a-real-thing {}
                        
                        /* @transform-error(label) ${transformerWarnings.UNKNOWN_PSEUDO_ELEMENT(
                            `not-a-real-thing`
                        )} */
                        .root::not-a-real-thing {}
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.combine([
                    testInlineExpectsErrors.diagnosticsSeverityMismatch(
                        `transform`,
                        `info`,
                        `warning`,
                        transformerWarnings.UNKNOWN_PSEUDO_ELEMENT(`not-a-real-thing`)
                    ),
                    testInlineExpectsErrors.diagnosticsSeverityMismatch(
                        `transform`,
                        `error`,
                        `warning`,
                        transformerWarnings.UNKNOWN_PSEUDO_ELEMENT(`not-a-real-thing`),
                        `(label): `
                    ),
                ])
            );
        });
        it(`should throw on missing diagnostic`, () => {
            const result = generateStylableResult({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            /* @transform-warn fake diagnostic message */
                            .root {}
                            
                            /* @transform-warn(label) fake diagnostic message */
                            .root {}
                        `,
                    },
                },
            });

            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.combine([
                    testInlineExpectsErrors.diagnosticExpectedNotFound(
                        `transform`,
                        `fake diagnostic message`
                    ),
                    testInlineExpectsErrors.diagnosticExpectedNotFound(
                        `transform`,
                        `fake diagnostic message`,
                        `(label): `
                    ),
                ])
            );
        });
        it(`should check against rawAst (for nodes that are removed in transform)`, () => {
            const result = generateStylableResult({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            /* @transform-warn(should match) word(./x.st.css) ${STImport.diagnostics.UNKNOWN_IMPORTED_FILE(
                                `./x.st.css`
                            )} */
                            @st-import A from "./x.st.css";

                            /* @transform-warn(should fail) ${STImport.diagnostics.ST_IMPORT_EMPTY_FROM()} */
                            @st-import B from "./x.st.css";
                        `,
                    },
                },
            });

            // only the second expectation should fail - the first one should be found
            expect(() => testInlineExpects(result)).to.throw(
                testInlineExpectsErrors.diagnosticExpectedNotFound(
                    `transform`,
                    STImport.diagnostics.ST_IMPORT_EMPTY_FROM()
                )
            );
        });
    });
    describe(`@check`, () => {
        it(`should proxy to @rule and @atrule`, () => {
            const result = generateStylableResult({
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
            const result = generateStylableResult({
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
