import { CSSLayer } from '@stylable/core/dist/features';
import {
    testStylableCore,
    shouldReportNoDiagnostics,
    diagnosticBankReportToStrings,
} from '@stylable/core-test-kit';
import deindent from 'deindent';
import { expect } from 'chai';

const cssLayerDiagnostics = diagnosticBankReportToStrings(CSSLayer.diagnostics);

describe('features/css-layer', () => {
    it('should analyze @layer', () => {
        const { sheets } = testStylableCore(`
            /* @atrule(single) entry__single */
            @layer single;

            /* @atrule(multi) entry__one, entry__two */
            @layer one, two;
            
            /* @atrule(rules) entry__with-rules */
            @layer with-rules {
                .a {}
                /* @atrule(nested) entry__nested */
                @layer nested {
                    .b {}
                }
                .c {}
            }

            /* @atrule(no name) */
            @layer {
                .d {}
            }
        `);

        const { meta, exports } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        // symbols
        expect(CSSLayer.get(meta, 'single'), 'single symbol').to.eql({
            _kind: 'layer',
            name: 'single',
            alias: 'single',
            global: false,
            import: undefined,
        });
        expect(CSSLayer.get(meta, 'one'), 'single symbol').to.eql({
            _kind: 'layer',
            name: 'one',
            alias: 'one',
            global: false,
            import: undefined,
        });
        expect(CSSLayer.get(meta, 'two'), 'two symbol').to.eql({
            _kind: 'layer',
            name: 'two',
            alias: 'two',
            global: false,
            import: undefined,
        });
        expect(CSSLayer.get(meta, 'with-rules'), 'with-rules symbol').to.eql({
            _kind: 'layer',
            name: 'with-rules',
            alias: 'with-rules',
            global: false,
            import: undefined,
        });
        expect(CSSLayer.get(meta, 'nested'), 'nested symbol').to.eql({
            _kind: 'layer',
            name: 'nested',
            alias: 'nested',
            global: false,
            import: undefined,
        });

        // JS exports
        expect(exports.layers).to.eql({
            single: 'entry__single',
            one: 'entry__one',
            two: 'entry__two',
            'with-rules': 'entry__with-rules',
            nested: 'entry__nested',
        });
    });
    it(`should mark as global`, () => {
        const { sheets } = testStylableCore(`
            /* @atrule(single) name */
            @layer st-global(name);

            /* @atrule(multi) entry__ns1, g1, entry__ns2, g2 */
            @layer ns1, st-global(g1), ns2, st-global(g2);

            /* @atrule(global def before) g3 */
            @layer g3;
            /* @atrule(global def) g3 */
            @layer st-global(g3);
            /* @atrule(global def after) g3 */
            @layer g3;
        `);

        const { meta, exports } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        // symbols
        expect(CSSLayer.get(meta, `name`), `symbol`).to.eql({
            _kind: 'layer',
            alias: 'name',
            name: 'name',
            global: true,
            import: undefined,
        });
        expect(CSSLayer.get(meta, `ns1`), `symbol`).to.eql({
            _kind: 'layer',
            alias: 'ns1',
            name: 'ns1',
            global: false,
            import: undefined,
        });
        expect(CSSLayer.get(meta, `g1`), `symbol`).to.eql({
            _kind: 'layer',
            alias: 'g1',
            name: 'g1',
            global: true,
            import: undefined,
        });
        expect(CSSLayer.get(meta, `ns2`), `symbol`).to.eql({
            _kind: 'layer',
            alias: 'ns2',
            name: 'ns2',
            global: false,
            import: undefined,
        });
        expect(CSSLayer.get(meta, `g2`), `symbol`).to.eql({
            _kind: 'layer',
            alias: 'g2',
            name: 'g2',
            global: true,
            import: undefined,
        });
        expect(CSSLayer.get(meta, `g3`), `symbol`).to.eql({
            _kind: 'layer',
            alias: 'g3',
            name: 'g3',
            global: true,
            import: undefined,
        });

        // JS exports
        expect(exports.layers, `JS export`).to.eql({
            name: 'name',
            ns1: 'entry__ns1',
            ns2: 'entry__ns2',
            g1: 'g1',
            g2: 'g2',
            g3: 'g3',
        });
    });
    it('should transform nested layers', () => {
        const { sheets } = testStylableCore(`           
            /* @atrule(separated) entry__L1.entry__L2 */
            @layer L1.L2 {}

            /* @atrule(connected) entry__L3\\.L4 */
            @layer L3\\.L4 {}

            /* @atrule(repetition) entry__L1.entry__L2, entry__L1.entry__L3 */
            @layer L1.L2, L1.L3;
        `);

        const { meta, exports } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        // JS exports
        expect(exports.layers).to.eql({
            L1: 'entry__L1',
            L2: 'entry__L2',
            L3: 'entry__L3',
            'L3\\.L4': 'entry__L3\\.L4',
        });
    });
    it('should take escaped chars as part of layer name', () => {
        const { sheets } = testStylableCore(`           
            /* @atrule(repetition) entry__L1\\,L2 */
            @layer L1\\,L2 {}
        `);

        const { meta, exports } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        // JS exports
        expect(exports.layers).to.eql({
            'L1\\,L2': 'entry__L1\\,L2',
        });
    });
    it.skip('should combine global within nested layers', () => {
        /*
            Nested global definition is not supported at the moment.
            Workaround by changing the definition of L2 in 
            a separate @layer definition.
        */
        const { sheets } = testStylableCore(`           
            /* @atrule entry__L1.L2.entry__L3 */
            @layer L1.st-global(L2).L3 {}
        `);

        const { meta } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);
    });
    it('should report invalid cases', () => {
        const { sheets } = testStylableCore(`           
            /* 
                @analyze-warn(empty global) ${cssLayerDiagnostics.MISSING_LAYER_NAME_INSIDE_GLOBAL()} 
                @atrule st-global()
            */
            @layer st-global() {}

            /* @analyze-error(multi block) ${cssLayerDiagnostics.LAYER_SORT_STATEMENT_WITH_STYLE()} */
            @layer one, two {}

            /*
                @analyze-error(reserved wide keywords) word(initial) ${cssLayerDiagnostics.RESERVED_KEYWORD(
                    'initial'
                )}
                @atrule(reserved wide keywords) initial
            */
            @layer initial {}

            /*
                @analyze-error(not ident) ${cssLayerDiagnostics.NOT_IDENT('func()')}
                @atrule(not ident) func()
            */
            @layer func() {}
           
        `);
        // ToDo: check invalid ident "@layer 123 {}" / "@layer a.123.b;"

        const { meta } = sheets['/entry.st.css'];

        expect(meta.targetAst?.nodes[1]?.toString()).to.eql(`@layer st-global() {}`);
    });
    describe('st-import', () => {
        it('should resolve imported @layer', () => {
            const { sheets } = testStylableCore({
                '/imported.st.css': `
                    @layer layer1 {}
                    @layer layer2 {}
                `,
                '/entry.st.css': `
                    @st-import [layer(layer1, layer2 as local-layer)] from './imported.st.css';

                    /* @atrule(direct) imported__layer1 */
                    @layer layer1 {}

                    /* @atrule(mapped) imported__layer2 */
                    @layer local-layer {}
                `,
            });

            const { meta, exports } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            // symbols
            expect(CSSLayer.get(meta, `layer1`), `layer1 symbol`).to.include({
                _kind: 'layer',
                name: 'layer1',
                alias: 'layer1',
                global: false,
                import: meta.getImportStatements()[0],
            });
            expect(CSSLayer.get(meta, `local-layer`), `local-layer symbol`).to.include({
                _kind: 'layer',
                name: 'layer2',
                alias: 'local-layer',
                global: false,
                import: meta.getImportStatements()[0],
            });

            // JS exports
            expect(exports.layers, `JS exports`).to.eql({
                layer1: `imported__layer1`,
                'local-layer': `imported__layer2`,
            });
        });
        it('should resolve imported global @layer', () => {
            const { sheets } = testStylableCore({
                '/imported.st.css': `
                    @layer st-global(layer1) {}
                    @layer st-global(layer2) {}
                `,
                '/entry.st.css': `
                    @st-import [layer(layer1, layer2 as local-layer)] from './imported.st.css';

                    /* @atrule(direct) layer1 */
                    @layer layer1 {}

                    /* @atrule(mapped) layer2 */
                    @layer local-layer {}
                `,
            });

            const { meta, exports } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            // symbols
            expect(CSSLayer.get(meta, `layer1`), `layer1 symbol`).to.include({
                _kind: 'layer',
                name: 'layer1',
                alias: 'layer1',
                global: false,
                import: meta.getImportStatements()[0],
            });
            expect(CSSLayer.get(meta, `local-layer`), `local-layer symbol`).to.include({
                _kind: 'layer',
                name: 'layer2',
                alias: 'local-layer',
                global: false,
                import: meta.getImportStatements()[0],
            });

            // JS exports
            expect(exports.layers, `JS exports`).to.eql({
                layer1: `layer1`,
                'local-layer': `layer2`,
            });
        });
        it('should report unknown @layer import', () => {
            const { sheets } = testStylableCore({
                '/imported.st.css': ``,
                '/entry.st.css': `
                    /* @transform-error word(unknown) ${cssLayerDiagnostics.UNKNOWN_IMPORTED_LAYER(
                        `unknown`,
                        `./imported.st.css`
                    )} */
                    @st-import [layer(unknown as local)] from './imported.st.css';
                `,
            });

            const { meta, exports } = sheets['/entry.st.css'];

            // symbols
            expect(CSSLayer.get(meta, `local`), `symbol`).to.include({
                _kind: 'layer',
                name: 'unknown',
                alias: 'local',
                global: false,
                import: meta.getImportStatements()[0],
            });

            // JS exports
            expect(exports.layers, `JS exports`).to.eql({});
        });
        it('should transform nested layers (local and imported)', () => {
            const { sheets } = testStylableCore({
                '/imported.st.css': `
                    @layer L1 {}
                `,
                '/entry.st.css': `
                    @st-import [layer(L1)] from './imported.st.css';

                    @layer L2 {}

                    /* @atrule(direct) imported__L1.entry__L2 */
                    @layer L1.L2 {}
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it('should report imported @layer override attempt', () => {
            const { sheets } = testStylableCore({
                '/imported.st.css': `
                    @layer L1 {}
                `,
                '/entry.st.css': `
                    @st-import [layer(L1)] from './imported.st.css';

                    /* 
                        @analyze-error word(L1) ${cssLayerDiagnostics.RECONFIGURE_IMPORTED('L1')} 
                        @atrule imported__L1
                    */
                    @layer st-global(L1) {}
                `,
            });

            const { meta, exports } = sheets['/entry.st.css'];

            // symbols
            expect(CSSLayer.get(meta, `L1`), `symbol`).to.include({
                _kind: 'layer',
                name: 'L1',
                alias: 'L1',
                global: false,
                import: meta.getImportStatements()[0],
            });

            // JS exports
            expect(exports.layers, `JS exports`).to.eql({
                L1: `imported__L1`,
            });
        });
    });
    describe('st-mixin', () => {
        it('should mix @layer for nested mixin', () => {
            const { sheets } = testStylableCore(
                deindent(`
                @layer x {
                    .before { id: before-in-layer; }
                    .mix { id: mix-in-layer; }
                    .after { id: after-in-layer; }
                }

                .into {
                    -st-mixin: mix;
                }
            `)
            );

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            expect(meta.targetAst?.toString()).to.eql(
                deindent(`
                @layer entry__x {
                    .entry__before { id: before-in-layer; }
                    .entry__mix { id: mix-in-layer; }
                    .entry__after { id: after-in-layer; }
                }
                 .entry__into {
                }
                 @layer entry__x {
                    .entry__into { id: mix-in-layer; }
                }
            `)
            );
        });
    });
    describe('css-import', () => {
        it('transform native @import', () => {
            const { sheets } = testStylableCore({
                'other.st.css': `
                    @layer imported;
                `,
                'entry.st.css': `
                    /* @atrule(named) url("a.css") layer(entry__base) */
                    @import url("a.css") layer(base);

                    /* @atrule(nested) url("b.css") layer(entry__L1.entry__L2) */
                    @import url("b.css") layer(L1.L2);

                    /* @atrule(escaped) url("b.css") layer(entry__L3\\.X) */
                    @import url("b.css") layer(L3\\.X);

                    @layer st-global(global-layer);
                    /* @atrule(named) url("c.css") layer(global-layer) */
                    @import url("c.css") layer(global-layer);
                    
                    /* @atrule(unnamed) url("other.css") layer() */
                    @import url("other.css") layer();

                    @st-import [layer(imported)] from './other.st.css';
                    /* @atrule(imported) url("a.css") layer(other__imported) */
                    @import url("a.css") layer(imported);
                `,
            });

            const { meta, exports } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            // symbols
            expect(CSSLayer.get(meta, 'base'), 'single symbol').to.eql({
                _kind: 'layer',
                name: 'base',
                alias: 'base',
                global: false,
                import: undefined,
            });
            expect(CSSLayer.get(meta, 'L1'), 'nested symbol 1').to.eql({
                _kind: 'layer',
                name: 'L1',
                alias: 'L1',
                global: false,
                import: undefined,
            });
            expect(CSSLayer.get(meta, 'L2'), 'nested symbol 2').to.eql({
                _kind: 'layer',
                name: 'L2',
                alias: 'L2',
                global: false,
                import: undefined,
            });
            expect(CSSLayer.get(meta, 'L3\\.X'), 'escaped symbol').to.eql({
                _kind: 'layer',
                name: 'L3\\.X',
                alias: 'L3\\.X',
                global: false,
                import: undefined,
            });
            expect(CSSLayer.get(meta, 'global-layer'), 'global symbol').to.eql({
                _kind: 'layer',
                name: 'global-layer',
                alias: 'global-layer',
                global: true,
                import: undefined,
            });
            expect(CSSLayer.get(meta, 'imported'), 'imported symbol').to.eql({
                _kind: 'layer',
                name: 'imported',
                alias: 'imported',
                global: false,
                import: meta.getImportStatements()[0],
            });

            // JS exports
            expect(exports.layers).to.eql({
                base: 'entry__base',
                L1: 'entry__L1',
                L2: 'entry__L2',
                'L3\\.X': 'entry__L3\\.X',
                'global-layer': 'global-layer',
                imported: 'other__imported',
            });
        });
        it.skip('should not allow between @import rules', () => {
            testStylableCore(`
                @import url(before.css) layer(before);
                /* @analyze-error not allowed between @import statements */
                @layer between;
                @import url(after.css) layer(after);
            `);
        });
    });
    describe('native css', () => {
        it('should not namespace', () => {
            const { stylable } = testStylableCore({
                '/native.css': deindent`
                    @layer a, b;
                    @layer c {}
                `,
                '/entry.st.css': `
                    @st-import [layer(a, b, c)] from './native.css';

                    /* @atrule a.b.c */
                    @layer a.b.c {}
                `,
            });

            const { meta: nativeMeta } = stylable.transform('/native.css');
            const { meta, exports } = stylable.transform('/entry.st.css');

            shouldReportNoDiagnostics(nativeMeta);
            shouldReportNoDiagnostics(meta);

            expect(nativeMeta.targetAst?.toString().trim(), 'no native transform').to.eql(
                deindent`
                    @layer a, b;
                    @layer c {}
                `.trim()
            );

            // JS exports
            expect(exports.layers, 'JS export').to.eql({
                a: 'a',
                b: 'b',
                c: 'c',
            });
        });
        it('should ignore stylable specific transformations', () => {
            const { stylable } = testStylableCore({
                '/native.css': deindent`
                    @layer a, st-global(b);
                    @layer st-global(c) {}
                `,
            });

            const { meta: nativeMeta } = stylable.transform('/native.css');

            expect(nativeMeta.targetAst?.toString().trim(), 'no native transform').to.eql(
                deindent`
                    @layer a, st-global(b);
                    @layer st-global(c) {}
            `.trim()
            );
        });
    });
});
