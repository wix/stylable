import { STImport, CSSCustomProperty, STSymbol } from '@stylable/core/dist/features';
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

        const { meta } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        expect(CSSCustomProperty.get(meta, `--propA`), `--propA symbol`).to.eql({
            _kind: `cssVar`,
            name: `--propA`,
            global: false,
        });
        expect(CSSCustomProperty.get(meta, `--propB`), `--propB symbol`).to.eql({
            _kind: `cssVar`,
            name: `--propB`,
            global: false,
        });

        // deprecation
        expect(meta.cssVars, `deprecated 'meta.cssVars'`).to.eql({
            '--propA': CSSCustomProperty.get(meta, `--propA`),
            '--propB': CSSCustomProperty.get(meta, `--propB`),
        });
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

                /* @decl(as default) prop: var(--entry-colorC, black) */
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

        const { meta } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);
        expect(CSSCustomProperty.get(meta, `--colorA`), `--colorA symbol`).to.eql({
            _kind: `cssVar`,
            name: `--colorA`,
            global: false,
        });
        expect(CSSCustomProperty.get(meta, `--colorB`), `--colorB symbol`).to.eql({
            _kind: `cssVar`,
            name: `--colorB`,
            global: false,
        });
        expect(CSSCustomProperty.get(meta, `--colorC`), `--colorC symbol`).to.eql({
            _kind: `cssVar`,
            name: `--colorC`,
            global: false,
        });
        expect(CSSCustomProperty.get(meta, `--a`), `--a symbol`).to.eql({
            _kind: `cssVar`,
            name: `--a`,
            global: false,
        });
        expect(CSSCustomProperty.get(meta, `--b`), `--b symbol`).to.eql({
            _kind: `cssVar`,
            name: `--b`,
            global: false,
        });
        expect(CSSCustomProperty.get(meta, `--c`), `--c symbol`).to.eql({
            _kind: `cssVar`,
            name: `--c`,
            global: false,
        });
        expect(CSSCustomProperty.get(meta, `--d`), `--d symbol`).to.eql({
            _kind: `cssVar`,
            name: `--d`,
            global: false,
        });
        expect(CSSCustomProperty.get(meta, `--e`), `--e symbol`).to.eql({
            _kind: `cssVar`,
            name: `--e`,
            global: false,
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

        const { meta } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        expect(CSSCustomProperty.get(meta, `--propA`), `--propA symbol`).to.eql({
            _kind: `cssVar`,
            name: `--propA`,
            global: false,
        });
        expect(CSSCustomProperty.get(meta, `--propB`), `--propB symbol`).to.eql({
            _kind: `cssVar`,
            name: `--propB`,
            global: false,
        });
    });
    it(`should reuse css prop symbol between declaration usages`, () => {
        const { sheets } = testStylableCore(`
            .root {
                --prop: green;
            }
            .part {
                --prop: blue;
            }
        `);

        const { meta } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        expect(CSSCustomProperty.get(meta, `--prop`), `--prop symbol`).to.eql({
            _kind: `cssVar`,
            name: `--prop`,
            global: false,
        });
    });
    it(`should collect global css props`, () => {
        const { sheets } = testStylableCore(`
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
                @analyze-warn(no-dashes) word(propY) ${CSSCustomProperty.diagnostics.ILLEGAL_CSS_VAR_USE(
                    'propY'
                )}
            */
            @property propY {
                syntax: '<color>';
                initial-value: green;
                inherits: false;
            };
            
            /* 
                @atrule(no-dashes-global) st-global(propZ)
                @analyze-warn(no-dashes-global) word(propZ) ${CSSCustomProperty.diagnostics.ILLEGAL_CSS_VAR_USE(
                    'propZ'
                )}
            */
            @property st-global(propZ) {
                syntax: '<color>';
                initial-value: green;
                inherits: false;
            };

            .root {
                /* 
                    @decl(no-dashes) prop: var(propA) 
                    @analyze-warn(no-dashes) word(propA) ${CSSCustomProperty.diagnostics.ILLEGAL_CSS_VAR_USE(
                        'propA'
                    )}
                */
                prop: var(propA);

                /* 
                    @decl(space+text) prop: var(--entry-propB notAllowed, fallback) 
                    @analyze-warn(space+text) word(--propB notAllowed, fallback) ${CSSCustomProperty.diagnostics.ILLEGAL_CSS_VAR_ARGS(
                        '--propB notAllowed, fallback'
                    )}
                */
                prop: var(--propB notAllowed, fallback);
            }
        `);
    });
    describe(`@st-global-custom-property (deprecated)`, () => {
        it(`should mark properties as global`, () => {
            testStylableCore(`
                /* @analyze-info(first) ${CSSCustomProperty.diagnostics.DEPRECATED_ST_GLOBAL_CUSTOM_PROPERTY()}*/
                @st-global-custom-property --x;
                
                /* @analyze-info(second) ${CSSCustomProperty.diagnostics.DEPRECATED_ST_GLOBAL_CUSTOM_PROPERTY()}*/
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
        it(`should conflict with @property`, () => {
            const symbolDiag = STSymbol.diagnostics;
            // ToDo: report redeclare on on all definitions
            const { sheets } = testStylableCore(`
                /* @ToDo-analyze-warn(@property before) word(--before)
                    ${symbolDiag.REDECLARE_SYMBOL(`--before`)}*/
                @property --before {
                    syntax: '<color>';
                    initial-value: green;
                    inherits: false;
                };
                
                /*
                @analyze-warn(before) word(--before) ${symbolDiag.REDECLARE_SYMBOL(`--before`)}
                @ToDo-analyze-warn(after) word(--after) ${symbolDiag.REDECLARE_SYMBOL(`--after`)}
                */
                @st-global-custom-property --before, --after;
                
                /* @ToDo-analyze-warn(@property after) word(--after) 
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
            sheets;
        });
        it(`should report malformed syntax`, () => {
            testStylableCore(`
                /* 
                    @transform-remove(no-dashes)
                    @analyze-warn(no-dashes) word(propA) ${CSSCustomProperty.diagnostics.ILLEGAL_GLOBAL_CSS_VAR(
                        'propA'
                    )}
                */
                @st-global-custom-property propA;
                
                /* 
                    @transform-remove(missing comma)
                    @analyze-warn(missing comma) word(--propB --propC) ${CSSCustomProperty.diagnostics.GLOBAL_CSS_VAR_MISSING_COMMA(
                        '--propB --propC'
                    )}
                */
                @st-global-custom-property --propB --propC;
            `);
        });
    });
    describe(`st-import`, () => {
        it(`should resolve imported property to be set/get`, () => {
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
        });
        it(`should override imported with local definition`, () => {
            // ToDo: add redeclare diagnostics to import
            testStylableCore({
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
                        ToDo: fix
                        @ToDo-analyze-warn(imported before) word(--before) ${STSymbol.diagnostics.REDECLARE_SYMBOL(
                            `--before`
                        )}
                        @ToDo-analyze-warn(imported after) word(--after) ${STSymbol.diagnostics.REDECLARE_SYMBOL(
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
            // ToDo: check symbols and exports
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
            testStylableCore({
                '/props.st.css': ``,
                '/entry.st.css': `
                    /* @transform-warn word(--unknown) ${STImport.diagnostics.UNKNOWN_IMPORTED_SYMBOL(
                        '--unknown',
                        './props.st.css'
                    )} */
                    @st-import [--unknown] from './props.st.css';
                `,
            });
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
    });
});
