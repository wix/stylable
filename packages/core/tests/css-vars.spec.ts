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

        it('should process multiple different css var declarations', () => {
            const { cssVars, diagnostics, ast } = processSource(`
                .root {
                    --myVar: blue;
                    --myOtherVar: green;
                }
            `, { from: 'path/to/style.css' });

            expect(diagnostics.reports.length, 'no reports').to.eql(0);
            expect(cssVars).to.eql({
                myVar: {
                    _kind: 'cssVar',
                    name: 'myVar'
                },
                myOtherVar: {
                    _kind: 'cssVar',
                    name: 'myOtherVar'
                }
            });
        });

        it('should process multiple css var declarations with the same name', () => {
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
                myVar: {
                    _kind: 'cssVar',
                    name: 'myVar'
                }
            });
        });
    });

    describe('transform', () => {
        // What does it do?
        // - generates namespace for var declarations

        it('should transfrom css vars with their newly created namespace', () => {
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

        it('should transfrom known css vars usage', () => {
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

        it('should transfrom multiple css vars usage in a single declaration', () => {
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

        it('should NOT transfrom unknown css vars usage', () => {
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
