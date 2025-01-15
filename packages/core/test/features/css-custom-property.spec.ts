import { STImport, CSSCustomProperty, STSymbol } from '@stylable/core/dist/features';
import { generateScopedCSSVar } from '@stylable/core/dist/helpers/css-custom-property';
import {
    testStylableCore,
    shouldReportNoDiagnostics,
    diagnosticBankReportToStrings,
    deindent,
} from '@stylable/core-test-kit';
import chai, { expect } from 'chai';
import chaiSubset from 'chai-subset';
import type { StylableMeta } from '@stylable/core';

chai.use(chaiSubset);

const stImportDiagnostics = diagnosticBankReportToStrings(STImport.diagnostics);
const stSymbolDiagnostics = diagnosticBankReportToStrings(STSymbol.diagnostics);
const customPropertyDiagnostics = diagnosticBankReportToStrings(CSSCustomProperty.diagnostics);

describe(`features/css-custom-property`, () => {
    it(`should process css declaration prop`, () => {
        const { sheets } = testStylableCore(`
            .root {
                /* @decl(A) --entry-propA: green */
                --propA: green;

                /* @decl(B) --entry-propB: blue */
                --propB: blue;
            }
        `);

        const { meta, exports } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        // symbols
        expect(CSSCustomProperty.get(meta, `--propA`), `--propA symbol`).to.eql({
            _kind: `cssVar`,
            name: `--propA`,
            global: false,
            alias: undefined,
        });
        expect(CSSCustomProperty.get(meta, `--propB`), `--propB symbol`).to.eql({
            _kind: `cssVar`,
            name: `--propB`,
            global: false,
            alias: undefined,
        });

        // JS exports
        expect(exports.vars.propA, `propA JS export`).to.eql(`--entry-propA`);
        expect(exports.vars.propB, `propB JS export`).to.eql(`--entry-propB`);
    });
    it(`should process css declaration value var()`, () => {
        const { sheets } = testStylableCore(`
            .root {
                /* @decl(basic) prop: var(--entry-colorA) */
                prop: var(--colorA);

                /* @decl(concat) prop: var(--entry-colorA) var(--entry-colorB) */
                prop: var(--colorA) var(--colorB);

                /* @decl(within value) prop: 2px var(--entry-colorB) solid */
                prop: 2px var(--colorB) solid;

                /* @decl(with default) prop: var(--entry-colorC, black) */
                prop: var(--colorC, black);
                
                /* @decl(nested fallbacks) 
                    prop: var(--entry-a, var(--entry-b, var(--entry-c), var(--entry-d)), var(--entry-e))
                */
                prop: var(
                    --a,
                    var(
                        --b,
                        var(--c),
                        var(--d)
                    ),
                    var(--e)
                );
            }
        `);

        const { meta, exports } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        // symbols
        [`--colorA`, `--colorB`, `--colorC`, `--a`, `--b`, `--c`, `--d`, `--e`].forEach((name) => {
            expect(CSSCustomProperty.get(meta, name), `${name} symbol`).to.eql({
                _kind: `cssVar`,
                name,
                global: false,
                alias: undefined,
            });
        });

        // JS exports
        [`colorA`, `colorB`, `colorC`, `a`, `b`, `c`, `d`, `e`].forEach((name) => {
            expect(exports.vars[name], `${name} JS export`).to.eql(`--entry-${name}`);
        });
    });
    it(`should process @property definitions`, () => {
        const { sheets } = testStylableCore(`
            /* @atRule(runtime def) --entry-propA */
            @property --propA {
                syntax: '<color>';
                initial-value: green;
                inherits: false;
            }

            /* @transform-remove(only type) */
            @property --propB;
        `);

        const { meta, exports } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        // symbols
        expect(CSSCustomProperty.get(meta, `--propA`), `--propA symbol`).to.eql({
            _kind: `cssVar`,
            name: `--propA`,
            global: false,
            alias: undefined,
        });
        expect(CSSCustomProperty.get(meta, `--propB`), `--propB symbol`).to.eql({
            _kind: `cssVar`,
            name: `--propB`,
            global: false,
            alias: undefined,
        });

        // JS exports
        expect(exports.vars.propA, `propA JS export`).to.eql(`--entry-propA`);
        expect(exports.vars.propB, `propB JS export`).to.eql(`--entry-propB`);
    });
    it(`should process conflicted definitions`, () => {
        const { sheets } = testStylableCore(`
            /* @analyze-warn(@property conflicted) word(--conflicted)
                ${stSymbolDiagnostics.REDECLARE_SYMBOL(`--conflicted`)}*/
            @property --conflicted {
                syntax: '<color>';
                initial-value: green;
                inherits: false;
            };

            @property --valid {
                syntax: '<color>';
                initial-value: green;
                inherits: false;
            };

            /* @analyze-warn(@property conflicted) word(--conflicted)
                ${stSymbolDiagnostics.REDECLARE_SYMBOL(`--conflicted`)}*/
            @property --conflicted {
                syntax: '<color>';
                initial-value: green;
                inherits: false;
            };

            .root {
                /* @decl(conflicted decl) --entry-conflicted: var(--entry-conflicted) */
                --conflicted: var(--conflicted);
                
                /* @decl(valid decl) --entry-valid: var(--entry-valid) */
                --valid: var(--valid);
            }
        `);

        const { meta } = sheets['/entry.st.css'];

        // ToDo: move to test-kit: expectOnlyDiagnostics() - testStylableCore can output tested expectations
        expect(meta.diagnostics.reports.length, `no unexpected`).to.eql(2);
    });
    it(`should reuse css prop symbol between declaration usages`, () => {
        const { sheets } = testStylableCore(`
            .root {
                /* @decl --entry-prop: green */
                --prop: green;
            }
            .part {
                /* @decl --entry-prop: blue */
                --prop: blue;
            }
        `);

        const { meta } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);
    });
    it(`should collect global css props`, () => {
        const { sheets } = testStylableCore(`
            /* @transform-remove(build-def)*/
            @property st-global(--propX);

            /* @atrule(runtime-def) --propY */
            @property st-global(--propY) {
                syntax: '<color>';
                initial-value: green;
                inherits: false;
            }

            .root {
                /* @decl(prop) --propX: green */
                --propX: green;

                /* @decl(value) prop: var(--propX) */
                prop: var(--propX);

                /* @decl(value) --propY: var(--propY) */
                --propY: var(--propY);
            }
        `);

        const { meta } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);
    });
    it(`should report malformed syntax`, () => {
        testStylableCore(`
            /* 
                @atrule(no-dashes) propY 
                @analyze-error(no-dashes) word(propY) ${customPropertyDiagnostics.ILLEGAL_CSS_VAR_USE(
                    'propY',
                )}
            */
            @property propY {
                syntax: '<color>';
                initial-value: green;
                inherits: false;
            };
            
            /* 
                @atrule(no-dashes-global) st-global(propZ)
                @analyze-error(no-dashes-global) word(propZ) ${customPropertyDiagnostics.ILLEGAL_CSS_VAR_USE(
                    'propZ',
                )}
            */
            @property st-global(propZ) {
                syntax: '<color>';
                initial-value: green;
                inherits: false;
            };

            .decls {
                /* 
                    @decl(empty var) prop: var() 
                    @analyze-error(empty var) ${customPropertyDiagnostics.MISSING_PROP_NAME()}
                */
                prop: var();
            }

            .root {
                /* 
                    @decl(no-dashes) prop: var(propA) 
                    @analyze-error(no-dashes) word(propA) ${customPropertyDiagnostics.ILLEGAL_CSS_VAR_USE(
                        'propA',
                    )}
                */
                prop: var(propA);

                /* 
                    @decl(space+text) prop: var(--entry-propB notAllowed, fallback) 
                    @analyze-error(space+text) word(--propB notAllowed, fallback) ${customPropertyDiagnostics.ILLEGAL_CSS_VAR_ARGS(
                        '--propB notAllowed, fallback',
                    )}
                */
                prop: var(--propB notAllowed, fallback);
            }
        `);
    });
    it(`should collect runtime @property definitions`, () => {
        const { sheets } = testStylableCore(`
            @property --a;
            @property st-global(--b);

            @property --c {
                syntax: '<color>';
                initial-value: green;
                inherits: false;
            }
            @property st-global(--d) {
                syntax: '<color>';
                initial-value: green;
                inherits: false;
            }

            .root {
                --e: var(--f);
            }
        `);

        const { meta } = sheets['/entry.st.css'];

        expect(CSSCustomProperty.getRuntimeTypedDefinitionNames(meta)).to.eql(['--c', '--d']);
    });
    it('should warn on undefined property in strict mode', () => {
        testStylableCore(
            {
                '/invalid.st.css': `
                    .root {
                        /* 
                            @analyze-error word(--prop) ${customPropertyDiagnostics.UNDEFINED_CSS_CUSTOM_PROP(
                                '--prop',
                            )}
                            @decl --invalid-prop: green 
                        */
                        --prop: green;

                        /* 
                            @analyze-error word(--prop2) ${customPropertyDiagnostics.UNDEFINED_CSS_CUSTOM_PROP(
                                '--prop2',
                            )}
                            @decl color: var(--invalid-prop2) 
                        */
                        color: var(--prop2);
                    }
                `,
                '/valid.st.css': `
                    @st-import [--prop] from './invalid.st.css';
                    @property --prop2;

                    .root {
                        /* @decl --invalid-prop: green */
                        --prop: green;

                        /* @decl color: var(--valid-prop2) */
                        color: var(--prop2);
                    }
                `,
            },
            { stylableConfig: { flags: { strictCustomProperty: true } } },
        );
    });
    it.skip(`should escape`, () => {
        const { sheets } = testStylableCore(`
            .root {
                /* @decl --entry-aa\\.bb: var(--entry-cc\\{dd) */
                --aa\\.bb: var(--cc\\{dd);
            }
        `);

        const { exports } = sheets['/entry.st.css'];

        expect(exports.vars[`aa.bb`], `JS export prop`).to.eql(`--entry-aa\\.bb`);
        expect(exports.vars[`cc.dd`], `JS export value`).to.eql(`--entry-cc\\.dd`);
    });
    describe(`@property validation`, () => {
        it(`should report on missing syntax`, () => {
            const { sheets } = testStylableCore(`
                /* @analyze-error(syntax) word(--a) ${customPropertyDiagnostics.MISSING_REQUIRED_DESCRIPTOR(
                    'syntax',
                )} */
                @property --a {
                    inherits: true;
                    initial-value: #c0ffee;
                }

                /* @analyze-error(inherits) word(--b) ${customPropertyDiagnostics.MISSING_REQUIRED_DESCRIPTOR(
                    'inherits',
                )} */
                @property --b {
                    syntax: '<color>';
                    initial-value: #c0ffee;
                }

                /* @analyze-warn(inherits) word(--c) ${customPropertyDiagnostics.MISSING_REQUIRED_INITIAL_VALUE_DESCRIPTOR()} */
                @property --c {
                    syntax: '<color>';
                    inherits: false;
                }

                /* no error for syntax="*" and missing initial-value */
                @property --d {
                    syntax: '*';
                    inherits: false;
                }
            `);

            const { meta } = sheets['/entry.st.css'];

            expect(meta.diagnostics.reports.length, `no unexpected`).to.eql(3);
        });
        it(`should report invlid descriptor node type`, () => {
            testStylableCore(`
                @property --x {
                    syntax: '*';
                    inherits: false;

                    /* @analyze-error(atrule) word(abc) ${customPropertyDiagnostics.INVALID_DESCRIPTOR_TYPE(
                        'atrule',
                    )} */
                    @some-at-rule abc{}
                }

                @property --x {
                    syntax: '*';
                    inherits: false;

                    /* @analyze-error(rule) word(div) ${customPropertyDiagnostics.INVALID_DESCRIPTOR_TYPE(
                        'rule',
                    )} */
                    div {}
                }
            `);
        });
        it(`should report invalid descriptor`, () => {
            testStylableCore(`
                @property --x {
                    syntax: '*';
                    inherits: false;

                    /* @analyze-error word(initialValue) ${customPropertyDiagnostics.INVALID_DESCRIPTOR_NAME(
                        'initialValue',
                    )} */
                    initialValue: red;
                }
            `);
        });
    });
    describe(`@st-global-custom-property (deprecated)`, () => {
        it(`should mark properties as global`, () => {
            testStylableCore(`
                /* @analyze-info(first) ${customPropertyDiagnostics.DEPRECATED_ST_GLOBAL_CUSTOM_PROPERTY()}*/
                @st-global-custom-property --x;
                
                /* @analyze-info(second) ${customPropertyDiagnostics.DEPRECATED_ST_GLOBAL_CUSTOM_PROPERTY()}*/
                @st-global-custom-property --a      ,--b,
                --c  ,  --d  ;
    
                .root {
                    /* @decl(single) --x: var(--x) */
                    --x: var(--x);
                    
                    /* @decl(spaced multiple) prop: var(--a) var(--b) var(--c) var(--d) */
                    prop: var(--a) var(--b) var(--c) var(--d);
                }
            `);
        });
        it(`should conflict with @property - and override global definition`, () => {
            const { sheets } = testStylableCore(`
                /* @analyze-warn(@property before) word(--before)
                    ${stSymbolDiagnostics.REDECLARE_SYMBOL(`--before`)}*/
                @property --before {
                    syntax: '<color>';
                    initial-value: green;
                    inherits: false;
                };
                
                /*
                @analyze-warn(before) word(--before) ${stSymbolDiagnostics.REDECLARE_SYMBOL(
                    `--before`,
                )}
                @analyze-warn(after) word(--after) ${stSymbolDiagnostics.REDECLARE_SYMBOL(
                    `--after`,
                )}
                */
                @st-global-custom-property --before, --after;
                
                /* @analyze-warn(@property after) word(--after) 
                    ${stSymbolDiagnostics.REDECLARE_SYMBOL(`--after`)}*/
                @property --after{
                    syntax: '<color>';
                    initial-value: green;
                    inherits: false;
                };
    
                .root {
                    /* @decl(before global applied) --before: var(--before) */
                    --before: var(--before);
                    
                    /* @decl(after global applied) --after: var(--after) */
                    --after: var(--after);
                }
            `);

            const { meta } = sheets['/entry.st.css'];

            // 4 redeclare warn + 1 deprecation info
            expect(meta.diagnostics.reports.length, `no unexpected`).to.eql(5);
        });
        it(`should report malformed syntax`, () => {
            testStylableCore(`
                /* 
                    @transform-remove(no-dashes)
                    @analyze-error(no-dashes) word(propA) ${customPropertyDiagnostics.ILLEGAL_GLOBAL_CSS_VAR(
                        'propA',
                    )}
                */
                @st-global-custom-property propA;
                
                /* 
                    @transform-remove(missing comma)
                    @analyze-error(missing comma) word(--propB --propC) ${customPropertyDiagnostics.GLOBAL_CSS_VAR_MISSING_COMMA(
                        '--propB --propC',
                    )}
                */
                @st-global-custom-property --propB --propC;
            `);
        });
    });
    describe(`st-import`, () => {
        it(`should resolve imported property to set/get`, () => {
            const { sheets } = testStylableCore({
                '/props.st.css': `
                    .root {
                        --before: red;
                        --after: red;
                    }
                `,
                '/entry.st.css': `
                    .root {
                        /* @decl(set before) --props-before: green */
                        --before: green;

                        /* @decl(get before) prop: var(--props-before) */
                        prop: var(--before);

                        /* @decl(fallback before) prop: var(--entry-local, var(--props-before)) */
                        prop: var(--local, var(--before));
                    }
                    
                    @st-import [--before, --after] from './props.st.css';
                    
                    .root {
                        /* @decl(set after) --props-after: green */
                        --after: green;

                        /* @decl(get after) prop: var(--props-after) */
                        prop: var(--after);

                        /* @decl(fallback after) prop: var(--entry-local, var(--props-after)) */
                        prop: var(--local, var(--after));
                    }
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            // symbols
            expect(CSSCustomProperty.get(meta, `--before`), `--before symbol`).to.eql({
                _kind: `cssVar`,
                name: `--before`,
                global: false,
                alias: STSymbol.get(meta, `--before`, `import`),
            });
            expect(CSSCustomProperty.get(meta, `--after`), `--after symbol`).to.eql({
                _kind: `cssVar`,
                name: `--after`,
                global: false,
                alias: STSymbol.get(meta, `--after`, `import`),
            });
        });
        it(`should NOT expose imported symbols properties to runtime`, () => {
            const { sheets } = testStylableCore({
                '/props.st.css': `
                    @property --propA;
                    .root {
                        --propB: red;
                    }
                `,
                '/entry.st.css': `
                    @st-import [--propA, --propB as --local] from './props.st.css';
                    .root {
                        --propA: green;
                    }
                `,
            });

            const { meta, exports } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            // JS exports
            expect(exports.vars).to.eql({});
        });
        it(`should re-export imported symbols`, () => {
            const { sheets } = testStylableCore({
                '/base.st.css': `
                    .root {
                        --deepProp: red;
                    }
                `,
                '/props.st.css': `
                    @st-import [--deepProp] from './base.st.css';
                    .root {
                        --propA: red;
                        --propB: red;
                    }
                `,
                '/entry.st.css': `
                    @st-import [--propA, --propB as --local, --deepProp] from './props.st.css';
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it(`should override imported with local definition`, () => {
            const { sheets } = testStylableCore({
                '/props.st.css': `
                    .root {
                        --before: red;
                        --after: red;
                    }
                `,
                '/entry.st.css': `
                    /* @analyze-warn(before) ${stSymbolDiagnostics.REDECLARE_SYMBOL(`--before`)} */
                    @property --before;
                    
                    /* 
                    @analyze-warn(imported before) word(--before) ${stSymbolDiagnostics.REDECLARE_SYMBOL(
                        `--before`,
                    )}
                    @analyze-warn(imported after) word(--after) ${stSymbolDiagnostics.REDECLARE_SYMBOL(
                        `--after`,
                    )}
                    */
                    @st-import [--before, --after] from "./props.st.css";
                    
                    /* @analyze-warn(after) ${stSymbolDiagnostics.REDECLARE_SYMBOL(`--after`)} */
                    @property --after;

                    .root {
                        /* @decl prop1: var(--entry-before)*/
                        prop1: var(--before);
                        
                        /* @decl prop2: var(--entry-after)*/
                        prop2: var(--after);
                    }
                `,
            });

            const { meta, exports } = sheets['/entry.st.css'];

            // symbols
            expect(CSSCustomProperty.get(meta, `--before`), `--before symbol`).to.eql({
                _kind: `cssVar`,
                name: `--before`,
                global: false,
                alias: undefined,
            });
            expect(CSSCustomProperty.get(meta, `--after`), `--after symbol`).to.eql({
                _kind: `cssVar`,
                name: `--after`,
                global: false,
                alias: undefined,
            });

            // JS exports
            expect(exports.vars.before, `before JS export`).to.eql(`--entry-before`);
            expect(exports.vars.after, `after JS export`).to.eql(`--entry-after`);
        });
        it(`should resolve mapped property`, () => {
            const { sheets } = testStylableCore({
                '/props.st.css': `
                    .root {
                        --a: red;
                    }
                `,
                '/entry.st.css': `
                    @st-import [--a as --mapped] from './props.st.css';
                    
                    .root {
                        /* @decl(set) --props-a: green */
                        --mapped: green;

                        /* @decl(get) prop: var(--props-a) */
                        prop: var(--mapped);

                        /* @decl(fallback) prop: var(--entry-local, var(--props-a)) */
                        prop: var(--local, var(--mapped));
                    }
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            // symbols
            expect(CSSCustomProperty.get(meta, `--mapped`), `--mapped symbol`).to.eql({
                _kind: `cssVar`,
                name: `--mapped`,
                global: false,
                alias: STSymbol.get(meta, `--mapped`, `import`),
            });
        });
        it(`should resolve global property`, () => {
            const { sheets } = testStylableCore({
                '/props.st.css': `
                    @property st-global(--a);
                `,
                '/entry.st.css': `
                    @st-import [--a] from './props.st.css';
                    
                    .root {
                        /* @decl(set) --a: green */
                        --a: green;

                        /* @decl(get) prop: var(--a) */
                        prop: var(--a);

                        /* @decl(fallback) prop: var(--entry-local, var(--a)) */
                        prop: var(--local, var(--a));
                    }
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it(`should handle unresolved property`, () => {
            const { sheets } = testStylableCore({
                '/props.st.css': ``,
                '/entry.st.css': `
                    /* @transform-error word(--unknown) ${stImportDiagnostics.UNKNOWN_IMPORTED_SYMBOL(
                        '--unknown',
                        './props.st.css',
                    )} */
                    @st-import [--unknown] from './props.st.css';

                    .root {
                        /* @decl --entry-unknown: var(--entry-unknown)*/
                        --unknown: var(--unknown);
                    } 
                `,
            });

            const { meta, exports } = sheets['/entry.st.css'];

            // symbols
            expect(CSSCustomProperty.get(meta, `--unknown`), `--unknown symbol`).to.eql({
                _kind: `cssVar`,
                name: `--unknown`,
                global: false,
                alias: STSymbol.get(meta, `--unknown`, `import`),
            });

            // JS exports
            expect(exports.vars.unknown, `unknown JS export`).to.eql(`--entry-unknown`);
        });
    });
    describe(`st-vars`, () => {
        it(`should resolve a value to be set`, () => {
            const { sheets } = testStylableCore(`
                :vars {
                    blue: blue;
                    green: green;
                }

                .root {
                    /* @decl(single) --entry-a: blue */
                    --a: value(blue);

                    /* @decl(concat vars) --entry-b: green blue */
                    --b: value(green) value(blue);
                }
            `);

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it(`should resolve a fallback value`, () => {
            const { sheets } = testStylableCore(`
                :vars {
                    blue: blue;
                    green: green;
                }

                .root {
                    /* @decl(single fallback) prop: var(--entry-color, blue) */
                    prop: var(--color, value(blue));

                    /* @decl(concat vars) prop: var(--entry-twoColors, green blue) */
                    prop: var(--twoColors, value(green) value(blue));

                    /* @decl(nested fallbacks) 
                    prop: var(--entry-a, var(--entry-b, var(--entry-c), green), blue)
                    */
                    prop: var(
                        --a,
                        var(
                            --b,
                            var(--c),
                            value(green)
                        ),
                        value(blue)
                    );
                }
            `);

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it(`should define property as var value`, () => {
            const { sheets } = testStylableCore({
                './origin.st.css': `
                    :vars {
                        x: var(--x);
                    }
                `,
                './entry.st.css': `
                    @st-import [x as importedVar] from './origin.st.css';
                    :vars {
                        y: var(--y);
                        z: value(y) value(importedVar);
                    }

                    .root {
                        --x: context property does not override property from origin;

                        /* @decl(local) prop: var(--entry-y) */
                        prop: value(y);

                        /* @decl(imported) prop: var(--origin-x) */
                        prop: value(importedVar);

                        /* @decl(mix) prop: var(--entry-y) var(--origin-x) */
                        prop: value(z);
                    }
                `,
            });

            const { meta, exports } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            // symbols
            expect(CSSCustomProperty.get(meta, `--y`), `--y symbol`).to.eql({
                _kind: `cssVar`,
                name: `--y`,
                global: false,
                alias: undefined,
            });

            // JS exports
            expect(exports.vars, `JS export`).to.eql({ y: `--entry-y`, x: `--entry-x` });
        });
        it(`should preserve string value with custom property`, () => {
            const { sheets } = testStylableCore({
                './origin.st.css': `
                    :vars {
                        x: 'var(--x)';
                    }
                `,
                './entry.st.css': `
                    @st-import [x as importedVar] from './origin.st.css';
                    :vars {
                        y: "var(--y)";
                        z: value(y) value(importedVar);
                    }

                    .root {
                        /* @decl(local) prop: var(--y) */
                        prop: value(y);

                        /* @decl(imported) prop: var(--x) */
                        prop: value(importedVar);

                        /* @decl(mix) prop: var(--y) var(--x) */
                        prop: value(z);
                    }
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            // symbols
            expect(CSSCustomProperty.get(meta, `--y`), `--y symbol`).to.eql(undefined);

            // JS exports
            expect(exports.vars, `JS export`).to.eql(undefined);
        });
    });
    describe(`st-formatter`, () => {
        it(`should resolve a value to be set`, () => {
            const { sheets } = testStylableCore({
                '/formatter.js': `
                    module.exports = function(arg) {
                        return arg;
                    }
                `,
                '/entry.st.css': `
                    @st-import print from './formatter';
                    
                    .root {
                        /* @decl --entry-a: blue */
                        --a: print(blue);
                    }
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it(`should resolve a fallback value`, () => {
            const { sheets } = testStylableCore({
                '/formatter.js': `
                    module.exports = function(arg) {
                        return arg;
                    }
                `,
                '/entry.st.css': `
                    @st-import print from './formatter';

                    .root {
                        /* @decl(single fallback) prop: var(--entry-color, blue) */
                        prop: var(--color, print(blue));

                        /* @decl(nested fallbacks) 
                        prop: var(--entry-a, var(--entry-b, var(--entry-c), green), blue)
                        */
                        prop: var(
                            --a,
                            var(
                                --b,
                                var(--c),
                                print(green)
                            ),
                            print(blue)
                        );
                    }
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
    });
    describe(`st-mixin`, () => {
        it(`should resolve the mixin origin css property symbol`, () => {
            const { sheets } = testStylableCore({
                '/imported.st.css': `
                    .mix {
                        prop: var(--a);
                    }
                `,
                '/entry.st.css': `
                    @st-import [mix as imported] from './imported.st.css';

                    .local-mix {
                        prop: var(--a);
                    }
                    
                    /* @rule(imported) .entry__root { prop: var(--imported-a) } */
                    .root {
                        -st-mixin: imported;
                    }
                    
                    /* @rule(local) .entry__root { prop: var(--entry-a) } */
                    .root {
                        -st-mixin: local-mix;
                    }
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it(`should resolve property as stylable var replacement`, () => {
            const { sheets } = testStylableCore(`
                :vars {
                    stVar: green;
                }

                .mix {}
                .mix:hover {
                    color: var(--a, value(stVar));
                }
                
                /* @rule[1] .entry__root:hover {
                    color: var(--entry-a, var(--entry-b))
                } */
                .root {
                    -st-mixin: mix(
                        stVar var(--b)
                    );
                }
            `);

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it('should namespace custom-props within build vars', () => {
            const { sheets } = testStylableCore({
                './mix.st.css': `
                    :vars {
                        x: var(--x);
                    }
                    .mix {
                        val: value(x);
                    }
                `,
                './entry.st.css': `
                    @st-import [mix as importedMix] from './mix.st.css';
                    :vars {
                        x: var(--y);
                    }
                    .localMix {
                        val: value(x);
                    }

                    /* @rule(local) .entry__root { val: var(--entry-y); } */
                    .root {
                        -st-mixin: localMix;
                    }

                    /* @rule(imported) .entry__root { val: var(--mix-x); } */
                    .root {
                        -st-mixin: importedMix;
                    }

                    /* @rule(with local override) .entry__root { val: var(--entry-y); } */
                    .root {
                        -st-mixin: importedMix(x value(x));
                    }
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
    });
    describe(`unit`, () => {
        it('scopeCSSVar', () => {
            const { sheets, stylable } = testStylableCore({
                '/imported.st.css': `
                    @st-global-custom-property --imported-global;

                    .root {
                        --imported: ;
                    }
                `,
                '/entry.st.css': `
                    @st-global-custom-property --local-global;
        
                    @st-import [--imported, --imported-global] from "./imported.st.css";

                    .root {
                        --local: ;
                    }
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            expect(CSSCustomProperty.scopeCSSVar(stylable.resolver, meta, '--unknown')).to.equal(
                generateScopedCSSVar('entry', 'unknown'),
            );

            expect(CSSCustomProperty.scopeCSSVar(stylable.resolver, meta, '--local'), `b`).to.equal(
                generateScopedCSSVar('entry', 'local'),
            );

            expect(CSSCustomProperty.scopeCSSVar(stylable.resolver, meta, '--imported')).to.equal(
                generateScopedCSSVar('imported', 'imported'),
            );

            expect(
                CSSCustomProperty.scopeCSSVar(stylable.resolver, meta, '--imported-global'),
            ).to.equal('--imported-global');
            expect(
                CSSCustomProperty.scopeCSSVar(stylable.resolver, meta, '--local-global'),
            ).to.equal('--local-global');
        });
    });
    describe('native css', () => {
        it('should not namespace', () => {
            const { stylable } = testStylableCore(
                {
                    '/native.css': deindent(`
                    @property --a {
                        syntax: '<color>';
                        initial-value: green;
                        inherits: false;
                    }
                    .x {
                        --b: var(--c);
                    }
                `),
                    '/entry.st.css': `
                    @st-import [--a, --b, --c] from './native.css';

                    .root {
                        /* @decl --a: var(--a) */
                        --a: var(--a);

                        /* @decl --b: var(--b) */
                        --b: var(--b);

                        /* @decl --c: var(--c) */
                        --c: var(--c);
                    }
                `,
                },
                { stylableConfig: { flags: { strictCustomProperty: true } } },
            );

            const { meta: nativeMeta } = stylable.transform('/native.css');
            const { meta } = stylable.transform('/entry.st.css');

            shouldReportNoDiagnostics(nativeMeta);
            shouldReportNoDiagnostics(meta);

            expect(nativeMeta.targetAst?.toString().trim(), 'no native transform').to.eql(
                deindent(`
                    @property --a {
                        syntax: '<color>';
                        initial-value: green;
                        inherits: false;
                    }
                    .x {
                        --b: var(--c);
                    }
                `),
            );
        });
        it('should ignore strictCustomProperty', () => {
            const { stylable } = testStylableCore(
                {
                    '/entry.css': `
                        .root {
                            /* @decl --a: var(--z) */
                            --a: var(--z);
                        }
                    `,
                },
                { stylableConfig: { flags: { strictCustomProperty: true } } },
            );

            const { meta } = stylable.transform('/entry.css');

            shouldReportNoDiagnostics(meta);
        });
        it('should ignore stylable specific transformations', () => {
            const { stylable } = testStylableCore({
                '/native.css': deindent(`
                    @st-global-custom-property --a;
                    @property st-global(--a) {
                        syntax: '<color>';
                        initial-value: green;
                        inherits: false;
                    }
                    @property --no-body;
                `),
            });

            const { meta: nativeMeta } = stylable.transform('/native.css');

            expect(nativeMeta.targetAst?.toString().trim(), 'no native transform').to.eql(
                deindent(`
                    @st-global-custom-property --a;
                    @property st-global(--a) {
                        syntax: '<color>';
                        initial-value: green;
                        inherits: false;
                    }
                    @property --no-body;
                `),
            );
        });
    });
    describe('introspection', () => {
        function expectSourceLocation({
            source: { meta, start, end },
            expected,
        }: {
            source: { meta: StylableMeta; start: { offset: number }; end: { offset: number } };
            expected: string;
        }) {
            const actualSrc = meta.sourceAst.toString().slice(start.offset, end.offset);
            expect(actualSrc).to.eql(expected);
        }
        describe('getProperties', () => {
            it('should resolve all local properties', () => {
                const { stylable, sheets } = testStylableCore(
                    deindent(`
                        @property --defInAtRule {
                            syntax: '<color>';
                            initial-value: green;
                            inherits: false;
                        }

                        .root {
                            --defineInPropName: green;

                            color: var(--defineInDeclValue);
                        }
                    `),
                );

                const { meta } = sheets['/entry.st.css'];

                const properties = stylable.cssCustomProperty.getProperties(meta);

                expect(properties).to.containSubset({
                    '--defInAtRule': {
                        meta,
                        localName: '--defInAtRule',
                        targetName: '--entry-defInAtRule',
                    },
                    '--defineInPropName': {
                        meta,
                        localName: '--defineInPropName',
                        targetName: '--entry-defineInPropName',
                    },
                    '--defineInDeclValue': {
                        meta,
                        localName: '--defineInDeclValue',
                        targetName: '--entry-defineInDeclValue',
                    },
                });
                expectSourceLocation({
                    source: properties['--defInAtRule'].source,
                    expected: `@property --defInAtRule {\n    syntax: '<color>';\n    initial-value: green;\n    inherits: false;\n}`,
                });
                expectSourceLocation({
                    source: properties['--defineInPropName'].source,
                    expected: `--defineInPropName: green;`,
                });
                expectSourceLocation({
                    source: properties['--defineInDeclValue'].source,
                    expected: `color: var(--defineInDeclValue);`,
                });
            });
            it('should resolve imported properties', () => {
                const { stylable, sheets } = testStylableCore({
                    'deep.st.css': `
                        .x {
                            --deep: red;
                        }
                    `,
                    'proxy.st.css': `
                        @st-import [--deep as --deepReassign1] from './deep.st.css';
                        .x {
                            --proxy: var(--deepReassign1);
                        }
                    `,
                    'entry.st.css': deindent(`
                        @st-import [--proxy as --proxyReassign, --deepReassign1 as --deepReassign2] from './proxy.st.css';

                        .x {
                            --local: green;
                        }
                    `),
                });

                const { meta } = sheets['/entry.st.css'];
                const { meta: proxyMeta } = sheets['/proxy.st.css'];
                const { meta: deepMeta } = sheets['/deep.st.css'];

                const properties = stylable.cssCustomProperty.getProperties(meta);

                expect(properties).to.containSubset({
                    '--local': {
                        meta,
                        localName: '--local',
                        targetName: '--entry-local',
                    },
                    '--proxyReassign': {
                        meta: proxyMeta,
                        localName: '--proxy',
                        targetName: '--proxy-proxy',
                    },
                    '--deepReassign2': {
                        meta: deepMeta,
                        localName: '--deep',
                        targetName: '--deep-deep',
                    },
                });
                expectSourceLocation({
                    source: properties['--local'].source,
                    expected: `--local: green;`,
                });
                expectSourceLocation({
                    source: properties['--proxyReassign'].source,
                    expected: `--proxy: var(--deepReassign1);`,
                });
                expectSourceLocation({
                    source: properties['--deepReassign2'].source,
                    expected: `--deep: red;`,
                });
            });
        });
    });
});
