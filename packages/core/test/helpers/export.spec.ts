import { Diagnostics } from '@stylable/core';
import {
    analyzeStExport,
    emptyAnalyzedExports,
    analyzeExportMessages,
} from '@stylable/core/dist/helpers/export';
import { expect } from 'chai';
import { atRule } from 'postcss';

describe('helpers/export', () => {
    describe('analyze', () => {
        it('should handle empty named', () => {
            const diagnostics = new Diagnostics();
            const analyzed = emptyAnalyzedExports();
            const input = atRule({ params: '[]', name: 'st-export' });

            analyzeStExport(input, analyzed, diagnostics);

            expect(analyzed).to.eql({
                stExports: {
                    publicToPrivate: { named: {}, typed: {} },
                    privateToPublic: { named: {}, typed: {} },
                },
                jsExports: {
                    publicToPrivate: { named: {}, typed: {} },
                    privateToPublic: { named: {}, typed: {} },
                },
            });
        });
        it('should collect exports', () => {
            const diagnostics = new Diagnostics();
            const analyzed = emptyAnalyzedExports();
            const input = atRule({ params: '[a, b]', name: 'st-export' });

            analyzeStExport(input, analyzed, diagnostics);

            expect(analyzed).to.eql({
                stExports: {
                    publicToPrivate: { named: { a: 'a', b: 'b' }, typed: {} },
                    privateToPublic: { named: { a: ['a'], b: ['b'] }, typed: {} },
                },
                jsExports: {
                    publicToPrivate: { named: { a: 'a', b: 'b' }, typed: {} },
                    privateToPublic: { named: { a: ['a'], b: ['b'] }, typed: {} },
                },
            });
        });
        it('should collect mapped exports', () => {
            const diagnostics = new Diagnostics();
            const analyzed = emptyAnalyzedExports();
            const input = atRule({ params: '[a as x, b as y]', name: 'st-export' });

            analyzeStExport(input, analyzed, diagnostics);

            expect(analyzed).to.eql({
                stExports: {
                    publicToPrivate: { named: { x: 'a', y: 'b' }, typed: {} },
                    privateToPublic: { named: { a: ['x'], b: ['y'] }, typed: {} },
                },
                jsExports: {
                    publicToPrivate: { named: { x: 'a', y: 'b' }, typed: {} },
                    privateToPublic: { named: { a: ['x'], b: ['y'] }, typed: {} },
                },
            });
        });
        it('should collect typed exports', () => {
            const diagnostics = new Diagnostics();
            const analyzed = emptyAnalyzedExports();
            const input = atRule({
                params: '[t1(a, b as x), t2(a, c as y)]',
                name: 'st-export',
            });

            analyzeStExport(input, analyzed, diagnostics);

            expect(analyzed).to.eql({
                stExports: {
                    publicToPrivate: {
                        named: {},
                        typed: {
                            t1: { a: 'a', x: 'b' },
                            t2: { a: 'a', y: 'c' },
                        },
                    },
                    privateToPublic: {
                        named: {},
                        typed: {
                            t1: { a: ['a'], b: ['x'] },
                            t2: { a: ['a'], c: ['y'] },
                        },
                    },
                },
                jsExports: {
                    publicToPrivate: {
                        named: {},
                        typed: {
                            t1: { a: 'a', x: 'b' },
                            t2: { a: 'a', y: 'c' },
                        },
                    },
                    privateToPublic: {
                        named: {},
                        typed: {
                            t1: { a: ['a'], b: ['x'] },
                            t2: { a: ['a'], c: ['y'] },
                        },
                    },
                },
            });
        });
        it('should collect definitions with multiple exported names', () => {
            const diagnostics = new Diagnostics();
            const analyzed = emptyAnalyzedExports();
            const input = atRule({ params: '[a as x, a as y]', name: 'st-export' });

            analyzeStExport(input, analyzed, diagnostics);

            expect(analyzed).to.eql({
                stExports: {
                    publicToPrivate: { named: { x: 'a', y: 'a' }, typed: {} },
                    privateToPublic: { named: { a: ['x', 'y'] }, typed: {} },
                },
                jsExports: {
                    publicToPrivate: { named: { x: 'a', y: 'a' }, typed: {} },
                    privateToPublic: { named: { a: ['x', 'y'] }, typed: {} },
                },
            });
        });
        it('should accumulate exports', () => {
            const diagnostics = new Diagnostics();
            const analyzed = emptyAnalyzedExports();

            analyzeStExport(
                atRule({ params: '[a as x, a as y]', name: 'st-export' }),
                analyzed,
                diagnostics
            );
            analyzeStExport(
                atRule({ params: '[b, c as z]', name: 'st-export' }),
                analyzed,
                diagnostics
            );
            analyzeStExport(atRule({ params: '[t(d)]', name: 'st-export' }), analyzed, diagnostics);

            expect(analyzed).to.eql({
                stExports: {
                    publicToPrivate: {
                        named: { x: 'a', y: 'a', b: 'b', z: 'c' },
                        typed: { t: { d: 'd' } },
                    },
                    privateToPublic: {
                        named: { a: ['x', 'y'], b: ['b'], c: ['z'] },
                        typed: { t: { d: ['d'] } },
                    },
                },
                jsExports: {
                    publicToPrivate: {
                        named: { x: 'a', y: 'a', b: 'b', z: 'c' },
                        typed: { t: { d: 'd' } },
                    },
                    privateToPublic: {
                        named: { a: ['x', 'y'], b: ['b'], c: ['z'] },
                        typed: { t: { d: ['d'] } },
                    },
                },
            });
        });
        it('should specify top level export target', () => {
            const diagnostics = new Diagnostics();
            const analyzed = emptyAnalyzedExports();

            analyzeStExport(
                atRule({ params: 'to(css) [a, b]', name: 'st-export' }),
                analyzed,
                diagnostics
            );
            analyzeStExport(
                atRule({ params: 'to(js) [c, d]', name: 'st-export' }),
                analyzed,
                diagnostics
            );
            analyzeStExport(
                atRule({ params: 'to(css, js) [e]', name: 'st-export' }),
                analyzed,
                diagnostics
            );

            expect(analyzed).to.eql({
                stExports: {
                    publicToPrivate: {
                        named: { a: 'a', b: 'b', e: 'e' },
                        typed: {},
                    },
                    privateToPublic: {
                        named: { a: ['a'], b: ['b'], e: ['e'] },
                        typed: {},
                    },
                },
                jsExports: {
                    publicToPrivate: {
                        named: { c: 'c', d: 'd', e: 'e' },
                        typed: {},
                    },
                    privateToPublic: {
                        named: { c: ['c'], d: ['d'], e: ['e'] },
                        typed: {},
                    },
                },
            });
        });
        describe('diagnostics', () => {
            it('should report unknown export target', () => {
                const expected = analyzeExportMessages.UNKNOWN_EXPORT_TARGET('json');
                const diagnostics = new Diagnostics();
                const analyzed = emptyAnalyzedExports();
                const input = atRule({ params: 'to(json) [a]', name: 'st-export' });

                analyzeStExport(input, analyzed, diagnostics);

                const diag = diagnostics.reports.find(
                    ({ message }) => message === expected.message
                );
                expect(diag).to.include(expected);
            });
            it('should report repeated targets', () => {
                const expected = analyzeExportMessages.REPEATED_TARGET('js');
                const diagnostics = new Diagnostics();
                const analyzed = emptyAnalyzedExports();
                const input = atRule({ params: 'to(js, css, js) []', name: 'st-export' });

                analyzeStExport(input, analyzed, diagnostics);

                const diag = diagnostics.reports.find(
                    ({ message }) => message === expected.message
                );
                expect(diag).to.include(expected);
            });
            it('should report on conflicting exports', () => {
                const expected1 = analyzeExportMessages.CONFLICTING_EXPORTS('x', 'css');
                const expected2 = analyzeExportMessages.CONFLICTING_EXPORTS('x', 'js');
                const diagnostics = new Diagnostics();
                const analyzed = emptyAnalyzedExports();
                const input = atRule({ params: '[a as x, b as x]', name: 'st-export' });

                analyzeStExport(input, analyzed, diagnostics);

                const diag1 = diagnostics.reports.find(
                    ({ message }) => message === expected1.message
                );
                const diag2 = diagnostics.reports.find(
                    ({ message }) => message === expected2.message
                );

                expect(diag1, 'css conflict').to.include(expected1);
                expect(diag2, 'js conflict').to.include(expected2);
            });
            it('should report multiple "to()"', () => {
                const expected = analyzeExportMessages.MULTIPLE_TO();
                const diagnostics = new Diagnostics();
                const analyzed = emptyAnalyzedExports();
                const input = atRule({ params: 'to(css) to(js) [a]', name: 'st-export' });

                analyzeStExport(input, analyzed, diagnostics);

                const diag = diagnostics.reports.find(
                    ({ message }) => message === expected.message
                );
                expect(diag).to.include(expected);
            });
            it('should report unexpected value in "to()"', () => {
                const expected = analyzeExportMessages.UNEXPECTED_TO_BLOCK_VALUE('js');
                const diagnostics = new Diagnostics();
                const analyzed = emptyAnalyzedExports();
                const input = atRule({ params: 'to(css js) []', name: 'st-export' });

                analyzeStExport(input, analyzed, diagnostics);

                const diag = diagnostics.reports.find(
                    ({ message }) => message === expected.message
                );
                expect(diag).to.include(expected);
            });
            it('should report unclosed "to()"', () => {
                const expected = analyzeExportMessages.UNCLOSED_TO();
                const diagnostics = new Diagnostics();
                const analyzed = emptyAnalyzedExports();
                const input = atRule({ params: 'to(css [a]', name: 'st-export' });

                analyzeStExport(input, analyzed, diagnostics);

                const diag = diagnostics.reports.find(
                    ({ message }) => message === expected.message
                );
                expect(diag).to.include(expected);
            });
            it('should report multiple named blocks', () => {
                const expected = analyzeExportMessages.MULTIPLE_NAMED_BLOCKS();
                const diagnostics = new Diagnostics();
                const analyzed = emptyAnalyzedExports();
                const input = atRule({ params: '[a] [b]', name: 'st-export' });

                analyzeStExport(input, analyzed, diagnostics);

                const diag = diagnostics.reports.find(
                    ({ message }) => message === expected.message
                );
                expect(diag).to.include(expected);
            });
            it('should report unclosed named blocks', () => {
                const expected = analyzeExportMessages.MULTIPLE_NAMED_BLOCKS();
                const diagnostics = new Diagnostics();
                const analyzed = emptyAnalyzedExports();
                const input = atRule({ params: '[a] [b]', name: 'st-export' });

                analyzeStExport(input, analyzed, diagnostics);

                const diag = diagnostics.reports.find(
                    ({ message }) => message === expected.message
                );
                expect(diag).to.include(expected);
            });
            it('should report unexpected content', () => {
                const expected = analyzeExportMessages.UNEXPECTED_VALUE('xxx');
                const diagnostics = new Diagnostics();
                const analyzed = emptyAnalyzedExports();
                const input = atRule({ params: 'to(css) [a] xxx', name: 'st-export' });

                analyzeStExport(input, analyzed, diagnostics);

                const diag = diagnostics.reports.find(
                    ({ message }) => message === expected.message
                );
                expect(diag).to.include(expected);
            });
            it('should report unexpected typed import', () => {
                const expected = analyzeExportMessages.UNCLOSED_TYPED_BLOCK('t1');
                const diagnostics = new Diagnostics();
                const analyzed = emptyAnalyzedExports();
                const input = atRule({ params: '[t1(a] xxx', name: 'st-export' });

                analyzeStExport(input, analyzed, diagnostics);

                const diag = diagnostics.reports.find(
                    ({ message }) => message === expected.message
                );
                expect(diag).to.include(expected);
            });
        });
    });
});
