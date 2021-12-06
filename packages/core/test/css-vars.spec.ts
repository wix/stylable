import { expect } from 'chai';
import type * as postcss from 'postcss';
import {
    expectTransformDiagnostics,
    generateStylableResult,
    processSource,
} from '@stylable/core-test-kit';
import { processorWarnings } from '@stylable/core';
import { STSymbol, STImport } from '@stylable/core/dist/features';

describe('css custom-properties (vars)', () => {
    describe('process', () => {
        // What does it do?
        // - locates all css var declarations, grouping them by name
        // - exposes defined vars as stylesheet exports

        it('multiple different css var declarations', () => {
            const { cssVars, diagnostics } = processSource(
                `
                .root {
                    --myVar: blue;
                    --myOtherVar: green;
                }
            `,
                { from: 'path/to/style.css' }
            );

            expect(diagnostics.reports.length, 'no reports').to.eql(0);
            expect(cssVars).to.eql({
                '--myVar': {
                    _kind: 'cssVar',
                    name: '--myVar',
                    global: false,
                },
                '--myOtherVar': {
                    _kind: 'cssVar',
                    name: '--myOtherVar',
                    global: false,
                },
            });
        });

        it('global (unscoped) declarations', () => {
            const { cssVars, diagnostics } = processSource(
                `
                @property st-global(--myGlobalVar);

                .root {
                    --myGlobalVar: red;
                }
            `,
                { from: 'path/to/style.css' }
            );

            expect(diagnostics.reports.length, 'no reports').to.eql(0);
            expect(cssVars).to.eql({
                '--myGlobalVar': {
                    _kind: 'cssVar',
                    name: '--myGlobalVar',
                    global: true,
                },
            });
        });

        it('multiple css var declarations with the same name', () => {
            const { cssVars, diagnostics } = processSource(
                `
                .root {
                    --myVar: blue;
                }
                .part {
                    --myVar: green;
                }
            `,
                { from: 'path/to/style.css' }
            );

            expect(diagnostics.reports.length, 'no reports').to.eql(0);
            expect(cssVars).to.eql({
                '--myVar': {
                    _kind: 'cssVar',
                    name: '--myVar',
                    global: false,
                },
            });
        });
    });

    describe('transform', () => {
        // What does it do?
        // - generates namespace for var declarations

        it('should hoist st-global-custom-property', () => {
            const res = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        @property --x;
                        @st-global-custom-property --x;
                        `,
                    },
                },
            });

            expect(res.exports.vars).to.eql({ x: '--x' });
        });

        it('css vars with their newly created namespace', () => {
            const res = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        .root {
                            --myVar: blue;
                        }
                        `,
                    },
                },
            });

            expect(
                res.meta.diagnostics.reports,
                'no diagnostics reported for native states'
            ).to.eql([]);

            const decl = (res.meta.outputAst!.nodes[0] as postcss.Rule)
                .nodes[0] as postcss.Declaration;
            expect(decl.prop).to.equal('--entry-myVar');
            expect(decl.value).to.equal('blue');
        });

        it('local css var usage', () => {
            const res = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        .root {
                            --myVar: blue;
                            color: var(--myVar);
                        }
                        `,
                    },
                },
            });

            expect(
                res.meta.diagnostics.reports,
                'no diagnostics reported for native states'
            ).to.eql([]);

            const decl = (res.meta.outputAst!.nodes[0] as postcss.Rule)
                .nodes[1] as postcss.Declaration;
            expect(decl.prop).to.equal('color');
            expect(decl.value).to.equal('var(--entry-myVar)');
        });

        it('css var usage with default, mid declaration value', () => {
            const res = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        .root {
                            --myVar: solid;
                            border: 2px var(--myVar, black) black;
                        }
                        `,
                    },
                },
            });

            expect(
                res.meta.diagnostics.reports,
                'no diagnostics reported for native states'
            ).to.eql([]);

            const decl = (res.meta.outputAst!.nodes[0] as postcss.Rule)
                .nodes[1] as postcss.Declaration;
            expect(decl.value).to.equal('2px var(--entry-myVar, black) black');
        });

        it('with default and stylable variables together', () => {
            const res = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        :vars {
                            borderStyle: dashed;
                            borderColor: black;
                        }

                        .root {
                            --myVar: solid blue;
                            border: 2px var(--myVar, value(borderStyle) value(borderColor));
                        }
                        `,
                    },
                },
            });

            expect(
                res.meta.diagnostics.reports,
                'no diagnostics reported for native states'
            ).to.eql([]);

            const decl = (res.meta.outputAst!.nodes[0] as postcss.Rule)
                .nodes[1] as postcss.Declaration;
            expect(decl.value).to.equal('2px var(--entry-myVar, dashed black)');
        });

        it('with nested var default (scoped)', () => {
            const res = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        :vars {
                            myColor: orange;
                        }
                        .root {
                            --top: green;
                            --mid: blue;
                            --base: purple;
                            background: var(--top, var(--mid, var(--base), value(myColor)), value(myColor));
                        }
                        `,
                    },
                },
            });

            expect(
                res.meta.diagnostics.reports,
                'no diagnostics reported for native states'
            ).to.eql([]);

            const decl = (res.meta.outputAst!.nodes[0] as postcss.Rule)
                .nodes[3] as postcss.Declaration;
            expect(decl.value).to.equal(
                'var(--entry-top, var(--entry-mid, var(--entry-base), orange), orange)'
            );
        });

        it(`with formatter for default value`, () => {
            const res = generateStylableResult({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./formatter";
                                -st-default: print;
                            }
                            .root {
                                --myVar: black;
                                background: var(--myVar, print(green));
                            }
                        `,
                    },
                    '/formatter.js': {
                        content: `
                            module.exports = function(arg) {
                                return arg;
                            }
                        `,
                    },
                },
            });

            const decl = (res.meta.outputAst!.nodes[0] as postcss.Rule)
                .nodes[1] as postcss.Declaration;
            expect(decl.value).to.equal('var(--entry-myVar, green)');
        });

        it(`with stylable var for var declaration initial value`, () => {
            const res = generateStylableResult({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            :vars {
                                myColor: green;
                            }

                            .root {
                                --myVar: value(myColor);
                            }
                        `,
                    },
                },
            });

            const decl = (res.meta.outputAst!.nodes[0] as postcss.Rule)
                .nodes[0] as postcss.Declaration;
            expect(decl.value).to.equal('green');
        });

        it(`with formatter for var declaration initial value`, () => {
            const res = generateStylableResult({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./formatter";
                                -st-default: print;
                            }
                            .root {
                                --myVar: print(green);
                            }
                        `,
                    },
                    '/formatter.js': {
                        content: `
                            module.exports = function(arg) {
                                return arg;
                            }
                        `,
                    },
                },
            });

            const decl = (res.meta.outputAst!.nodes[0] as postcss.Rule)
                .nodes[0] as postcss.Declaration;
            expect(decl.value).to.equal('green');
        });

        it('multiple local css vars usage in the same declaration (1)', () => {
            const res = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        .root {
                            color: var(--var1) var(--var2);
                            --var1: red;
                            --var2: green;
                        }
                        `,
                    },
                },
            });

            expect(
                res.meta.diagnostics.reports,
                'no diagnostics reported for native states'
            ).to.eql([]);

            const decl = (res.meta.outputAst!.nodes[0] as postcss.Rule)
                .nodes[0] as postcss.Declaration;
            expect(decl.value).to.equal('var(--entry-var1) var(--entry-var2)');
        });

        it('multiple local css vars usage in the same declaration (2)', () => {
            const res = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        .root {
                            --size: 5px;
                            --type: dashed;
                            --color: blue;
                            border: var(--size) var( --type ) var(--color);
                        }
                        `,
                    },
                },
            });

            expect(
                res.meta.diagnostics.reports,
                'no diagnostics reported for native states'
            ).to.eql([]);

            const decl = (res.meta.outputAst!.nodes[0] as postcss.Rule)
                .nodes[3] as postcss.Declaration;
            expect(decl.value).to.equal('var(--entry-size) var( --entry-type ) var(--entry-color)');
        });

        it('should transfrom css vars usage with no declaration (local scope)', () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        .root {
                            color: var(--myVar, green);
                        }
                        `,
                    },
                },
            });

            const decl = (meta.outputAst!.nodes[0] as postcss.Rule).nodes[0] as postcss.Declaration;

            expect(meta.diagnostics.reports.length).to.equal(0);
            expect(meta.transformDiagnostics!.reports.length).to.equal(0);

            expect(decl.prop).to.equal('color');
            expect(decl.value).to.equal('var(--entry-myVar, green)');
        });

        it('imported usage', () => {
            const res = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        :import {
                            -st-from: './imported.st.css';
                            -st-named: --myVar;
                        }
                        .root {
                            color: var(--myVar);
                        }
                        `,
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                        .root {
                            --myVar: blue;
                        }
                        `,
                    },
                },
            });

            expect(
                res.meta.diagnostics.reports,
                'no diagnostics reported for native states'
            ).to.eql([]);

            const decl = (res.meta.outputAst!.nodes[0] as postcss.Rule)
                .nodes[0] as postcss.Declaration;
            expect(decl.prop).to.equal('color');
            expect(decl.value).to.equal('var(--imported-myVar)');
        });

        it('imported usage with named as', () => {
            const res = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        :import {
                            -st-from: './imported.st.css';
                            -st-named: --myVar as --renamed;
                        }
                        .root {
                            color: var(--renamed);
                        }
                        `,
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                        .root {
                            --myVar: blue;
                        }
                        `,
                    },
                },
            });

            expect(
                res.meta.diagnostics.reports,
                'no diagnostics reported for native states'
            ).to.eql([]);

            const decl = (res.meta.outputAst!.nodes[0] as postcss.Rule)
                .nodes[0] as postcss.Declaration;
            expect(decl.prop).to.equal('color');
            expect(decl.value).to.equal('var(--imported-myVar)');
        });

        it('imported usage with local override', () => {
            const res = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        :import {
                            -st-from: './imported.st.css';
                            -st-named: --myVar;
                        }
                        .root {
                            --myVar: green;
                            color: var(--myVar);
                        }
                        `,
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                        .root {
                            --myVar: blue;
                        }
                        `,
                    },
                },
            });

            expect(
                res.meta.diagnostics.reports,
                'no diagnostics reported for native states'
            ).to.eql([]);

            const decl = (res.meta.outputAst!.nodes[0] as postcss.Rule)
                .nodes[1] as postcss.Declaration;
            expect(decl.prop).to.equal('color');
            expect(decl.value).to.equal('var(--imported-myVar)');
        });

        it('mixed local and imports of re-exported definitions and usage', () => {
            const res = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./mid.st.css";
                                -st-named: --baseVar;
                            }
                            .root {
                                prop1: var(--baseVar);
                            }
                            `,
                    },
                    '/mid.st.css': {
                        namespace: 'mid',
                        content: `
                            :import {
                                -st-from: "./base.st.css";
                                -st-named: --baseVar;
                            }
                            `,
                    },
                    '/base.st.css': {
                        namespace: 'base',
                        content: `
                            .root {
                                --baseVar: red;
                            }
                            `,
                    },
                },
            });

            expect(
                res.meta.diagnostics.reports,
                'no diagnostics reported for native states'
            ).to.eql([]);

            const baseDecl = (res.meta.outputAst!.nodes[0] as postcss.Rule)
                .nodes[0] as postcss.Declaration;

            expect(baseDecl.prop).to.equal('prop1');
            expect(baseDecl.value).to.equal('var(--base-baseVar)');
        });

        it('scoping var usages inside css mixin variable override', () => {
            const res = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        @property st-global(--myGlobal);

                        :vars {
                            arg1: red;
                            arg2: blue;
                        }

                        .root {
                            --myColor: green;
                            -st-mixin: mixin(arg1 var(--myColor));
                        }

                        .mixin {
                            color: value(arg1);
                            background: var(--myGlobal, value(arg2));
                        }
                        `,
                    },
                },
            });

            expect(
                res.meta.diagnostics.reports,
                'no diagnostics reported for native states'
            ).to.eql([]);

            const rule = res.meta.outputAst!.nodes[0] as postcss.Rule;
            const decl1 = rule.nodes[1] as postcss.Declaration;
            const decl2 = rule.nodes[2] as postcss.Declaration;
            expect(decl1.prop).to.equal('color');
            expect(decl1.value).to.equal('var(--entry-myColor)');
            expect(decl2.value).to.equal('var(--myGlobal, blue)');
        });

        describe('global (unscoped)', () => {
            it('does not scope css var declarations', () => {
                const res = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                            @property st-global(--myVar1);
                            @property st-global(--myVar2);

                            .root {
                                --myVar1: green;
                                --myVar2: red;
                            }
                            `,
                        },
                    },
                });
                expect(
                    res.meta.diagnostics.reports,
                    'no diagnostics reported for native states'
                ).to.eql([]);

                const decl1 = (res.meta.outputAst!.nodes[0] as postcss.Rule)
                    .nodes[0] as postcss.Declaration;
                const decl2 = (res.meta.outputAst!.nodes[0] as postcss.Rule)
                    .nodes[1] as postcss.Declaration;
                expect(decl1.prop).to.equal('--myVar1');
                expect(decl1.value).to.equal('green');
                expect(decl2.prop).to.equal('--myVar2');
                expect(decl2.value).to.equal('red');
            });

            it('should support any spacing between global variable definitions', () => {
                const config = {
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                            |@st-global-custom-property --myVar1      ,--myVar2,
                              --myVar3  ,  --myVar4  |;
                            .root {
                                --myVar1: 1;
                                --myVar2: 2;
                                --myVar3: 3;
                                --myVar4: 4;
                            }
                            `,
                        },
                    },
                };

                const res = expectTransformDiagnostics(config, [
                    {
                        file: '/entry.st.css',
                        message: processorWarnings.DEPRECATED_ST_GLOBAL_CUSTOM_PROPERTY(),
                        severity: 'info',
                    },
                ]);

                const decl1 = (res.meta.outputAst!.nodes[0] as postcss.Rule)
                    .nodes[0] as postcss.Declaration;
                const decl2 = (res.meta.outputAst!.nodes[0] as postcss.Rule)
                    .nodes[1] as postcss.Declaration;
                const decl3 = (res.meta.outputAst!.nodes[0] as postcss.Rule)
                    .nodes[2] as postcss.Declaration;
                const decl4 = (res.meta.outputAst!.nodes[0] as postcss.Rule)
                    .nodes[3] as postcss.Declaration;
                expect(decl1.prop).to.equal('--myVar1');
                expect(decl1.value).to.equal('1');
                expect(decl2.prop).to.equal('--myVar2');
                expect(decl2.value).to.equal('2');
                expect(decl3.prop).to.equal('--myVar3');
                expect(decl3.value).to.equal('3');
                expect(decl4.prop).to.equal('--myVar4');
                expect(decl4.value).to.equal('4');
            });

            it('mixed global and scoped var declarations', () => {
                const res = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                            @property st-global(--myVar);

                            .root {
                                --myVar: blue;
                                --myScopedVar: green;
                            }
                            `,
                        },
                    },
                });
                expect(
                    res.meta.diagnostics.reports,
                    'no diagnostics reported for native states'
                ).to.eql([]);

                const globalDecl = (res.meta.outputAst!.nodes[0] as postcss.Rule)
                    .nodes[0] as postcss.Declaration;
                const scopedDecl = (res.meta.outputAst!.nodes[0] as postcss.Rule)
                    .nodes[1] as postcss.Declaration;
                expect(globalDecl.prop).to.equal('--myVar');
                expect(scopedDecl.prop).to.equal('--entry-myScopedVar');
            });

            it('should not scope global var usage', () => {
                const res = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                            @property st-global(--myVar);

                            .root {
                                --myVar: blue;
                                color: var(--myVar);
                            }
                            `,
                        },
                    },
                });
                expect(
                    res.meta.diagnostics.reports,
                    'no diagnostics reported for native states'
                ).to.eql([]);

                const globalDecl = (res.meta.outputAst!.nodes[0] as postcss.Rule)
                    .nodes[1] as postcss.Declaration;
                expect(globalDecl.value).to.equal('var(--myVar)');
            });

            it('complex usage with imported global and scoped vars', () => {
                const res = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                            :import {
                                -st-from: "./imported.st.css";
                                -st-named: --importedGlobal, --importedScoped;
                            }

                            @property st-global(--localGlobal);

                            .root {
                                x1: var(--localScoped);
                                x2: var(--localGlobal);
                                x3: var(--importedScoped);
                                x4: var(--importedGlobal);
                                --localScoped: blue;
                                --localGlobal: red;
                            }
                            `,
                        },
                        '/imported.st.css': {
                            namespace: 'imported',
                            content: `
                            @property st-global(--importedGlobal);

                            .root {
                                --importedScoped: red;
                                --importedGlobal: blue;
                            }
                            `,
                        },
                    },
                });
                expect(
                    res.meta.diagnostics.reports,
                    'no diagnostics reported for native states'
                ).to.eql([]);

                const rule = res.meta.outputAst!.nodes[0] as postcss.Rule;
                const localScoped = (rule.nodes[0] as postcss.Declaration).value;
                const localGlobal = (rule.nodes[1] as postcss.Declaration).value;
                const importedScoped = (rule.nodes[2] as postcss.Declaration).value;
                const importedGlobal = (rule.nodes[3] as postcss.Declaration).value;

                expect(localScoped).to.equal('var(--entry-localScoped)');
                expect(localGlobal).to.equal('var(--localGlobal)');
                expect(importedScoped).to.equal('var(--imported-importedScoped)');
                expect(importedGlobal).to.equal('var(--importedGlobal)');
            });
        });
    });

    describe('diagnostics', () => {
        it('should report on "@st-global-custom-property" deprecation', () => {
            const config = {
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        |@st-global-custom-property --myVar|;
            
                        .root {
                            --myVar: blue;
                        }
                    `,
                    },
                },
            };

            const res = expectTransformDiagnostics(config, [
                {
                    file: '/entry.st.css',
                    message: processorWarnings.DEPRECATED_ST_GLOBAL_CUSTOM_PROPERTY(),
                    severity: 'info',
                },
            ]);
            expect(res.exports.vars).to.eql({
                myVar: '--myVar',
            });
        });

        it('trying to use illegal css var syntax', () => {
            const config = {
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        .root {
                            |color: var($illegalVar$)|;
                        }
                        `,
                    },
                },
            };

            const res = expectTransformDiagnostics(config, [
                {
                    message: processorWarnings.ILLEGAL_CSS_VAR_USE('illegalVar'),
                    file: '/entry.st.css',
                },
            ]);
            const decl = (res.meta.outputAst!.nodes[0] as postcss.Rule)
                .nodes[0] as postcss.Declaration;
            expect(decl.value).to.equal('var(illegalVar)');
        });

        it('trying to use illegal css var syntax', () => {
            const config = {
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        .root {
                            |color: var($--value illegalHere, red$)|;
                        }
                        `,
                    },
                },
            };

            const res = expectTransformDiagnostics(config, [
                {
                    message: processorWarnings.ILLEGAL_CSS_VAR_ARGS('--value illegalHere, red'),
                    file: '/entry.st.css',
                },
            ]);

            const decl = (res.meta.outputAst!.nodes[0] as postcss.Rule)
                .nodes[0] as postcss.Declaration;
            expect(decl.value).to.equal('var(--entry-value illegalHere, red)');
        });

        it('trying to import unknown css var', () => {
            const config = {
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        :import {
                            -st-from: "./imported.st.css";
                            |-st-named: $--unknownVar$;|
                        }
                        `,
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: ``,
                    },
                },
            };

            expectTransformDiagnostics(config, [
                {
                    message: STImport.diagnostics.UNKNOWN_IMPORTED_SYMBOL(
                        '--unknownVar',
                        './imported.st.css'
                    ),
                    file: '/entry.st.css',
                },
            ]);
        });

        it('global css var declarations must begin with "--"', () => {
            const config = {
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        |@property st-global($illegalVar$)|;
                        `,
                    },
                },
            };

            expectTransformDiagnostics(config, [
                {
                    message: processorWarnings.ILLEGAL_CSS_VAR_USE('illegalVar'),
                    file: '/entry.st.css',
                },
            ]);
        });

        it('global css var declarations must begin with "--" (deprecated)', () => {
            const config = {
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        |@st-global-custom-property illegalVar|;
                        `,
                    },
                },
            };

            expectTransformDiagnostics(config, [
                {
                    message: processorWarnings.DEPRECATED_ST_GLOBAL_CUSTOM_PROPERTY(),
                    file: '/entry.st.css',
                    severity: 'info',
                },
                {
                    message: processorWarnings.ILLEGAL_GLOBAL_CSS_VAR('illegalVar'),
                    file: '/entry.st.css',
                    skipLocationCheck: true,
                },
            ]);
        });

        it('global css vars must be separated by commas (deprecated)', () => {
            const config = {
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        |@st-global-custom-property --var1 --var2|;
                        `,
                    },
                },
            };

            expectTransformDiagnostics(config, [
                {
                    message: processorWarnings.DEPRECATED_ST_GLOBAL_CUSTOM_PROPERTY(),
                    file: '/entry.st.css',
                    severity: 'info',
                },
                {
                    message: processorWarnings.GLOBAL_CSS_VAR_MISSING_COMMA('--var1 --var2'),
                    file: '/entry.st.css',
                    skipLocationCheck: true,
                },
            ]);
        });

        it.only('clashing imported css var', () => {
            const config = {
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            |@property st-global(--before)|;

                            @st-import [--before, --after] from "./imported.st.css";

                            @property st-global(--after);

                            .root {
                                prop1: var(--before);
                                prop2: var(--after);
                            }
                            `,
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                            .root {
                                --before: red;
                                --after: red;
                            }
                            `,
                    },
                },
            };

            const { meta } = expectTransformDiagnostics(config, [
                {
                    message: STSymbol.diagnostics.REDECLARE_SYMBOL('--before'),
                    file: '/entry.st.css',
                },
                {
                    message: STSymbol.diagnostics.REDECLARE_SYMBOL('--after'),
                    file: '/entry.st.css',
                    skipLocationCheck: true,
                },
            ]);

            const rule = meta.outputAst!.nodes[0] as postcss.Rule;
            const firstDecl = rule.nodes[0] as postcss.Declaration;
            const secondDecl = rule.nodes[1] as postcss.Declaration;

            // ToDo: should be overridden by local (--before/--after)
            expect(firstDecl.value).to.equal('var(--imported-before)');
            expect(secondDecl.value).to.equal('var(--imported-after)');
        });

        it.only('clashing imported and global css var (deprecated)', () => {
            const config = {
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            |@st-global-custom-property --before|;
                            
                            @st-import [--before, --after] from "./imported.st.css";

                            |@st-global-custom-property --after|;

                            .root {
                                prop1: var(--before);
                                prop2: var(--after);
                            }
                            `,
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                            .root {
                                --before: red;
                                --after: red;
                            }
                            `,
                    },
                },
            };

            const { meta } = expectTransformDiagnostics(
                config,
                [
                    {
                        message: STSymbol.diagnostics.REDECLARE_SYMBOL('--before'),
                        file: '/entry.st.css',
                    },
                    {
                        message: STSymbol.diagnostics.REDECLARE_SYMBOL('--after'),
                        file: '/entry.st.css',
                        skipLocationCheck: true,
                    },
                ],
                { partial: true }
            );

            const rule = meta.outputAst!.nodes[0] as postcss.Rule;
            const firstDecl = rule.nodes[0] as postcss.Declaration;
            const secondDecl = rule.nodes[1] as postcss.Declaration;

            expect(firstDecl.value).to.equal('var(--before)');
            expect(secondDecl.value).to.equal('var(--after)');
        });
    });
});
