import { STImport, CSSCustomProperty, STSymbol } from '@stylable/core/dist/features';
import { generateScopedCSSVar } from '@stylable/core/dist/helpers/css-custom-property';
import { testStylableCore, shouldReportNoDiagnostics } from '@stylable/core-test-kit';
import { expect } from 'chai';

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
        const symbolDiag = STSymbol.diagnostics;
        const { sheets } = testStylableCore(`
            /* @analyze-warn(@property conflicted) word(--conflicted)
                ${symbolDiag.REDECLARE_SYMBOL(`--conflicted`)}*/
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
                ${symbolDiag.REDECLARE_SYMBOL(`--conflicted`)}*/
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
            /* @transform-remove(definition)*/
            @property st-global(--propX);

            .root {
                /* @decl(prop) --propX: green */
                --propX: green;

                /* @decl(value) prop: var(--propX) */
                prop: var(--propX);
            }
        `);

        const { meta } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);
    });
    it(`should report malformed syntax`, () => {
        testStylableCore(`
            /* 
                @atrule(no-dashes) propY 
                @analyze-error(no-dashes) word(propY) ${
                    CSSCustomProperty.diagnostics.ILLEGAL_CSS_VAR_USE('propY').message
                }
            */
            @property propY {
                syntax: '<color>';
                initial-value: green;
                inherits: false;
            };
            
            /* 
                @atrule(no-dashes-global) st-global(propZ)
                @analyze-error(no-dashes-global) word(propZ) ${
                    CSSCustomProperty.diagnostics.ILLEGAL_CSS_VAR_USE('propZ').message
                }
            */
            @property st-global(propZ) {
                syntax: '<color>';
                initial-value: green;
                inherits: false;
            };

            .decls {
                /* 
                    @decl(empty var) prop: var() 
                    @analyze-error(empty var) ${
                        CSSCustomProperty.diagnostics.MISSING_PROP_NAME().message
                    }
                */
                prop: var();
            }

            .root {
                /* 
                    @decl(no-dashes) prop: var(propA) 
                    @analyze-error(no-dashes) word(propA) ${
                        CSSCustomProperty.diagnostics.ILLEGAL_CSS_VAR_USE('propA').message
                    }
                */
                prop: var(propA);

                /* 
                    @decl(space+text) prop: var(--entry-propB notAllowed, fallback) 
                    @analyze-error(space+text) word(--propB notAllowed, fallback) ${
                        CSSCustomProperty.diagnostics.ILLEGAL_CSS_VAR_ARGS(
                            '--propB notAllowed, fallback'
                        ).message
                    }
                */
                prop: var(--propB notAllowed, fallback);
            }
        `);
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
                /* @analyze-error(syntax) word(--a) ${
                    CSSCustomProperty.diagnostics.MISSING_REQUIRED_DESCRIPTOR('syntax').message
                } */
                @property --a {
                    inherits: true;
                    initial-value: #c0ffee;
                }

                /* @analyze-error(inherits) word(--b) ${
                    CSSCustomProperty.diagnostics.MISSING_REQUIRED_DESCRIPTOR('inherits').message
                } */
                @property --b {
                    syntax: '<color>';
                    initial-value: #c0ffee;
                }

                /* @analyze-warn(inherits) word(--c) ${
                    CSSCustomProperty.diagnostics.MISSING_REQUIRED_INITIAL_VALUE_DESCRIPTOR()
                        .message
                } */
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

                    /* @analyze-error(atrule) word(abc) ${
                        CSSCustomProperty.diagnostics.INVALID_DESCRIPTOR_TYPE('atrule').message
                    } */
                    @some-at-rule abc{}
                }

                @property --x {
                    syntax: '*';
                    inherits: false;

                    /* @analyze-error(rule) word(div) ${
                        CSSCustomProperty.diagnostics.INVALID_DESCRIPTOR_TYPE('rule').message
                    } */
                    div {}
                }
            `);
        });
        it(`should report invalid descriptor`, () => {
            testStylableCore(`
                @property --x {
                    syntax: '*';
                    inherits: false;

                    /* @analyze-error word(initialValue) ${
                        CSSCustomProperty.diagnostics.INVALID_DESCRIPTOR_NAME('initialValue')
                            .message
                    } */
                    initialValue: red;
                }
            `);
        });
    });
    describe(`@st-global-custom-property (deprecated)`, () => {
        it(`should mark properties as global`, () => {
            testStylableCore(`
                /* @analyze-info(first) ${
                    CSSCustomProperty.diagnostics.DEPRECATED_ST_GLOBAL_CUSTOM_PROPERTY().message
                }*/
                @st-global-custom-property --x;
                
                /* @analyze-info(second) ${
                    CSSCustomProperty.diagnostics.DEPRECATED_ST_GLOBAL_CUSTOM_PROPERTY().message
                }*/
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
            const symbolDiag = STSymbol.diagnostics;
            const { sheets } = testStylableCore(`
                /* @analyze-warn(@property before) word(--before)
                    ${symbolDiag.REDECLARE_SYMBOL(`--before`)}*/
                @property --before {
                    syntax: '<color>';
                    initial-value: green;
                    inherits: false;
                };
                
                /*
                @analyze-warn(before) word(--before) ${symbolDiag.REDECLARE_SYMBOL(`--before`)}
                @analyze-warn(after) word(--after) ${symbolDiag.REDECLARE_SYMBOL(`--after`)}
                */
                @st-global-custom-property --before, --after;
                
                /* @analyze-warn(@property after) word(--after) 
                    ${symbolDiag.REDECLARE_SYMBOL(`--after`)}*/
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
                    @analyze-error(no-dashes) word(propA) ${
                        CSSCustomProperty.diagnostics.ILLEGAL_GLOBAL_CSS_VAR('propA').message
                    }
                */
                @st-global-custom-property propA;
                
                /* 
                    @transform-remove(missing comma)
                    @analyze-error(missing comma) word(--propB --propC) ${
                        CSSCustomProperty.diagnostics.GLOBAL_CSS_VAR_MISSING_COMMA(
                            '--propB --propC'
                        ).message
                    }
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

            const { meta, exports } = sheets['/entry.st.css'];

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

            // JS exports
            expect(exports.vars.before, `before JS export`).to.eql(`--props-before`);
            expect(exports.vars.after, `after JS export`).to.eql(`--props-after`);
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

            const { meta, exports } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            // JS exports
            expect(exports.vars.propA, `propA export`).to.eql(`--props-propA`);
            expect(exports.vars.local, `mapped export`).to.eql(`--props-propB`);
            expect(exports.vars.deepProp, `deep export`).to.eql(`--base-deepProp`);
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
                    /* @analyze-warn(before) ${STSymbol.diagnostics.REDECLARE_SYMBOL(`--before`)} */
                    @property --before;
                    
                    /* 
                    @analyze-warn(imported before) word(--before) ${STSymbol.diagnostics.REDECLARE_SYMBOL(
                        `--before`
                    )}
                    @analyze-warn(imported after) word(--after) ${STSymbol.diagnostics.REDECLARE_SYMBOL(
                        `--after`
                    )}
                    */
                    @st-import [--before, --after] from "./props.st.css";
                    
                    /* @analyze-warn(after) ${STSymbol.diagnostics.REDECLARE_SYMBOL(`--after`)} */
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

            const { meta, exports } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            // symbols
            expect(CSSCustomProperty.get(meta, `--mapped`), `--mapped symbol`).to.eql({
                _kind: `cssVar`,
                name: `--mapped`,
                global: false,
                alias: STSymbol.get(meta, `--mapped`, `import`),
            });

            // JS exports
            expect(exports.vars.mapped, `mapped JS export`).to.eql(`--props-a`);
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
                    /* @transform-warn word(--unknown) ${STImport.diagnostics.UNKNOWN_IMPORTED_SYMBOL(
                        '--unknown',
                        './props.st.css'
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
                generateScopedCSSVar('entry', 'unknown')
            );

            expect(CSSCustomProperty.scopeCSSVar(stylable.resolver, meta, '--local'), `b`).to.equal(
                generateScopedCSSVar('entry', 'local')
            );

            expect(CSSCustomProperty.scopeCSSVar(stylable.resolver, meta, '--imported')).to.equal(
                generateScopedCSSVar('imported', 'imported')
            );

            expect(
                CSSCustomProperty.scopeCSSVar(stylable.resolver, meta, '--imported-global')
            ).to.equal('--imported-global');
            expect(
                CSSCustomProperty.scopeCSSVar(stylable.resolver, meta, '--local-global')
            ).to.equal('--local-global');
        });
    });
});
