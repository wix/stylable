import { expect } from 'chai';
import * as postcss from 'postcss';
import { processorWarnings } from '../src';
import { expectWarnings, expectWarningsFromTransform } from './utils/diagnostics';
import { generateStylableResult, processSource } from './utils/generate-test-util';

describe('css custom-properties (vars)', () => {

    describe('process', () => {
        // What does it do?
        // - locates all css var declarations, grouping them by name
        // - exposes defined vars as stylesheet exports

        it('multiple different css var declarations', () => {
            const { cssVars, diagnostics, ast } = processSource(`
                .root {
                    --myVar: blue;
                    --myOtherVar: green;
                }
            `, { from: 'path/to/style.css' });

            expect(diagnostics.reports.length, 'no reports').to.eql(0);
            expect(cssVars).to.eql({
                '--myVar': {
                    _kind: 'cssVar',
                    name: '--myVar'
                },
                '--myOtherVar': {
                    _kind: 'cssVar',
                    name: '--myOtherVar'
                }
            });
        });

        it('global (unscoped) declarations', () => {
            const { cssVars, diagnostics, ast } = processSource(`
                @st-global-custom-property --myVar;
                .root {
                    --myVar: blue;
                }
            `, { from: 'path/to/style.css' });

            expect(diagnostics.reports.length, 'no reports').to.eql(0);
            expect(cssVars).to.eql({
                '--myVar': {
                    _kind: 'cssVar',
                    name: '--myVar',
                    global: true
                }
            });
        });

        it('multiple css var declarations with the same name', () => {
            const { cssVars, diagnostics, ast } = processSource(`
                .root {
                    --myVar: blue;
                }
                .part {
                    --myVar: green;
                }
            `, { from: 'path/to/style.css' });

            expect(diagnostics.reports.length, 'no reports').to.eql(0);
            expect(cssVars).to.eql({
                '--myVar': {
                    _kind: 'cssVar',
                    name: '--myVar'
                }
            });
        });
    });

    describe('transform', () => {
        // What does it do?
        // - generates namespace for var declarations

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
                        `
                    }
                }
            });

            expect(res.meta.diagnostics.reports, 'no diagnostics reported for native states').to.eql([]);

            const decl = ((res.meta.outputAst!.nodes![0] as postcss.Rule).nodes![0] as postcss.Declaration);
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
                        `
                    }
                }
            });

            expect(res.meta.diagnostics.reports, 'no diagnostics reported for native states').to.eql([]);

            const decl = ((res.meta.outputAst!.nodes![0] as postcss.Rule).nodes![1] as postcss.Declaration);
            expect(decl.prop).to.equal('color');
            expect(decl.value).to.equal('var(--entry-myVar)');
        });

        it('multiple local css vars usage in the same declaration', () => {
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
                        `
                    }
                }
            });

            expect(res.meta.diagnostics.reports, 'no diagnostics reported for native states').to.eql([]);

            const decl = ((res.meta.outputAst!.nodes![0] as postcss.Rule).nodes![0] as postcss.Declaration);
            expect(decl.value).to.equal('var(--entry-var1) var(--entry-var2)');
        });

        it('multiple css vars usage in a single declaration', () => {
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
                            border: var(--size) var(--type) var(--color);
                        }
                        `
                    }
                }
            });

            expect(res.meta.diagnostics.reports, 'no diagnostics reported for native states').to.eql([]);

            const decl = ((res.meta.outputAst!.nodes![0] as postcss.Rule).nodes![3] as postcss.Declaration);
            expect(decl.value).to.equal('var(--entry-size) var(--entry-type) var(--entry-color)');
        });

        it('should not transfrom unknown css vars usage', () => {
            const res = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        .root {
                            color: var(--myVar);
                        }
                        `
                    }
                }
            });

            expect(res.meta.diagnostics.reports, 'no diagnostics reported for native states').to.eql([]);

            const decl = ((res.meta.outputAst!.nodes![0] as postcss.Rule).nodes![0] as postcss.Declaration);
            expect(decl.prop).to.equal('color');
            expect(decl.value).to.equal('var(--myVar)');
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
                        `
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                        .root {
                            --myVar: blue;
                        }
                        `
                    }
                }
            });

            expect(res.meta.diagnostics.reports, 'no diagnostics reported for native states').to.eql([]);

            const decl = ((res.meta.outputAst!.nodes![0] as postcss.Rule).nodes![0] as postcss.Declaration);
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
                            `
                    },
                    '/mid.st.css': {
                        namespace: 'mid',
                        content: `
                            :import {
                                -st-from: "./base.st.css";
                                -st-named: --baseVar;
                            }
                            `
                    },
                    '/base.st.css': {
                        namespace: 'base',
                        content: `
                            .root {
                                --baseVar: red;
                            }
                            `
                    }
                }
            });

            expect(res.meta.diagnostics.reports, 'no diagnostics reported for native states').to.eql([]);

            const baseDecl = ((res.meta.outputAst!.nodes![0] as postcss.Rule).nodes![0] as postcss.Declaration);

            expect(baseDecl.prop).to.equal('prop1');
            expect(baseDecl.value).to.equal('var(--base-baseVar)');
        });

        describe('global (unscoped)', () => {
            it('does not scope css var declarations', () => {
                const res = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                            @st-global-custom-property --myVar1, --myVar2;

                            .root {
                                --myVar1: green;
                                --myVar2: red;
                            }
                            `
                        }
                    }
                });
                expect(res.meta.diagnostics.reports, 'no diagnostics reported for native states').to.eql([]);

                const decl1 = ((res.meta.outputAst!.nodes![0] as postcss.Rule).nodes![0] as postcss.Declaration);
                const decl2 = ((res.meta.outputAst!.nodes![0] as postcss.Rule).nodes![1] as postcss.Declaration);
                expect(decl1.prop).to.equal('--myVar1');
                expect(decl1.value).to.equal('green');
                expect(decl2.prop).to.equal('--myVar2');
                expect(decl2.value).to.equal('red');
            });

            it('mixed global and scoped var declarations', () => {
                const res = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                            @st-global-custom-property --myVar;

                            .root {
                                --myVar: blue;
                                --myScopedVar: green;
                            }
                            `
                        }
                    }
                });
                expect(res.meta.diagnostics.reports, 'no diagnostics reported for native states').to.eql([]);

                const globalDecl = ((res.meta.outputAst!.nodes![0] as postcss.Rule).nodes![0] as postcss.Declaration);
                const scopedDecl = ((res.meta.outputAst!.nodes![0] as postcss.Rule).nodes![1] as postcss.Declaration);
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
                            @st-global-custom-property --myVar;

                            .root {
                                --myVar: blue;
                                color: var(--myVar);
                            }
                            `
                        }
                    }
                });
                expect(res.meta.diagnostics.reports, 'no diagnostics reported for native states').to.eql([]);

                const globalDecl = ((res.meta.outputAst!.nodes![0] as postcss.Rule).nodes![1] as postcss.Declaration);
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

                            @st-global-custom-property --localGlobal;

                            .root {
                                x1: var(--localScoped);
                                x2: var(--localGlobal);
                                x3: var(--importedScoped);
                                x4: var(--importedGlobal);
                                --localScoped: blue;
                                --localGlobal: red;
                            }
                            `
                        },
                        '/imported.st.css': {
                            namespace: 'imported',
                            content: `
                            @st-global-custom-property --importedGlobal;

                            .root {
                                --importedScoped: red;
                                --importedGlobal: blue;
                            }
                            `
                        }
                    }
                });
                expect(res.meta.diagnostics.reports, 'no diagnostics reported for native states').to.eql([]);

                const rule = (res.meta.outputAst!.nodes![0] as postcss.Rule);
                const localScoped = (rule.nodes![0] as postcss.Declaration).value;
                const localGlobal = (rule.nodes![1] as postcss.Declaration).value;
                const importedScoped = (rule.nodes![2] as postcss.Declaration).value;
                const importedGlobal = (rule.nodes![3] as postcss.Declaration).value;

                expect(localScoped).to.equal('var(--entry-localScoped)');
                expect(localGlobal).to.equal('var(--localGlobal)');
                expect(importedScoped).to.equal('var(--imported-importedScoped)');
                expect(importedGlobal).to.equal('var(--importedGlobal)');
            });
        });
    });

    xdescribe('diagnostics', () => {

        // TODO: fill me
        it('should trigger a warning when trying to target an unknown state and keep the state', () => {
            const config = {
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `|.root:$unknownState$|{}`
                    }
                }
            };

            const res = expectWarningsFromTransform(config, [
                { message: '', file: '/entry.st.css' }
            ]);
            expect(res, 'keep unknown state').to.have.styleRules([`.entry--root:unknownState{}`]);
        });
    });
});
