import { STSymbol, CSSContains } from '@stylable/core/dist/features';
import {
    testStylableCore,
    shouldReportNoDiagnostics,
    diagnosticBankReportToStrings,
} from '@stylable/core-test-kit';
import deindent from 'deindent';
import { expect } from 'chai';

const diagnostics = diagnosticBankReportToStrings(CSSContains.diagnostics);
const stSymbolDiagnostics = diagnosticBankReportToStrings(STSymbol.diagnostics);

describe('features/css-contains', () => {
    it('should collect and namespace "container-name" and "container" decls', () => {
        const { sheets } = testStylableCore(`
            .a {
                /* @decl(single) container-name: entry__con-a */
                container-name: con-a;
            
                /* @decl(multi) container-name: entry__b entry__c */
                container-name: b c;

                /* @decl(shorthand) container: entry__d */
                container: d;

                /* @decl(shorthand+type) container: entry__e / normal */
                container: e / normal;
            }
        `);

        const { meta, exports } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        // symbols
        expect(CSSContains.get(meta, 'con-a'), 'con-a symbol').to.eql({
            _kind: 'container',
            name: 'con-a',
            alias: 'con-a',
            global: false,
            import: undefined,
        });
        expect(CSSContains.get(meta, 'b'), 'b symbol').to.eql({
            _kind: 'container',
            name: 'b',
            alias: 'b',
            global: false,
            import: undefined,
        });
        expect(CSSContains.get(meta, 'c'), 'c symbol').to.eql({
            _kind: 'container',
            name: 'c',
            alias: 'c',
            global: false,
            import: undefined,
        });
        expect(CSSContains.get(meta, 'd'), 'd symbol').to.eql({
            _kind: 'container',
            name: 'd',
            alias: 'd',
            global: false,
            import: undefined,
        });
        expect(CSSContains.get(meta, 'e'), 'e symbol').to.eql({
            _kind: 'container',
            name: 'e',
            alias: 'e',
            global: false,
            import: undefined,
        });

        // JS exports
        expect(exports.containers).to.eql({
            'con-a': 'entry__con-a',
            b: 'entry__b',
            c: 'entry__c',
            d: 'entry__d',
            e: 'entry__e',
        });
    });
    it('should preserve none container name', () => {
        const { sheets } = testStylableCore(`
            .a {
                /* @decl(longhand) container-name: none */
                container-name: none;

                /* @decl(shorthand) container: none / normal */
                container: none / normal;
            }
        `);

        const { meta, exports } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        // symbols
        expect(CSSContains.get(meta, 'none'), 'no none symbol').to.eql(undefined);

        // JS exports
        expect(exports.containers).to.eql({});
    });
    it('should mark as global', () => {
        const { sheets } = testStylableCore(`
            .a {
                /* @decl(use global) container-name: a b c d e */
                container-name: a b c d e;
                
                /* @decl(longhand) container-name: a */
                container-name: st-global(a);

                /* @decl(longhand multiple) container-name: a b */
                container-name: st-global(a) st-global(b);

                /* @decl(shorthand) container: c / normal */
                container: st-global(c) / normal;

                /* @decl(shorthand) container: d e / normal */
                container: st-global(d) st-global(e) / normal;
            }
        `);

        const { meta, exports } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        // symbols
        expect(CSSContains.get(meta, 'a'), 'a symbol').to.eql({
            _kind: 'container',
            name: 'a',
            alias: 'a',
            global: true,
            import: undefined,
        });
        expect(CSSContains.get(meta, 'b'), 'b symbol').to.eql({
            _kind: 'container',
            name: 'b',
            alias: 'b',
            global: true,
            import: undefined,
        });
        expect(CSSContains.get(meta, 'c'), 'c symbol').to.eql({
            _kind: 'container',
            name: 'c',
            alias: 'c',
            global: true,
            import: undefined,
        });
        expect(CSSContains.get(meta, 'd'), 'd symbol').to.eql({
            _kind: 'container',
            name: 'd',
            alias: 'd',
            global: true,
            import: undefined,
        });
        expect(CSSContains.get(meta, 'e'), 'e symbol').to.eql({
            _kind: 'container',
            name: 'e',
            alias: 'e',
            global: true,
            import: undefined,
        });

        // JS exports
        expect(exports.containers).to.eql({
            a: 'a',
            b: 'b',
            c: 'c',
            d: 'd',
            e: 'e',
        });
    });
    it('should report invalid decls', () => {
        testStylableCore(`
            .a {
                /* 
                    @analyze-error(longhand unexpected) word("?") ${diagnostics.UNEXPECTED_DECL_VALUE(
                        '"?"'
                    )}
                    @decl(longhand unexpected) container-name: entry__a "?" 
                */
                container-name: a "?";
                
                /* 
                    @analyze-error(shorthand unknown type) word(unknown-type) ${diagnostics.UNKNOWN_DECL_TYPE(
                        'unknown-type'
                    )}
                    @decl(shorthand unknown type) container: entry__a / unknown-type
                */
                container: a / unknown-type;

                /* 
                    @analyze-error(shorthand missing type) ${diagnostics.MISSING_DECL_TYPE()}
                    @decl(shorthand missing type) container: entry__a / 
                */
                container: a /;

                /* 
                    @analyze-error(shorthand unexpected) word("?") ${diagnostics.UNEXPECTED_DECL_VALUE(
                        '"?"'
                    )}
                    @decl(shorthand unexpected) container: "?"
                */
                container: "?";

                /* 
                    @analyze-warning(empty global) ${diagnostics.MISSING_CONTAINER_NAME_INSIDE_GLOBAL()}
                    @decl(empty global) container-name: 
                */
                container-name: st-global();
            }
        `);
    });
    it('should report invalid container name', () => {
        testStylableCore(`
            .a {
                /* 
                    @analyze-error(and) word(and) ${diagnostics.INVALID_CONTAINER_NAME('and')}
                    @decl(longhand and) container-name: entry__and 
                */
                container-name: and;

                /* 
                    @analyze-error(not) word(not) ${diagnostics.INVALID_CONTAINER_NAME('not')}
                    @decl(longhand not) container-name: entry__not 
                */
                container-name: not;

                /* 
                    @analyze-error(or) word(or) ${diagnostics.INVALID_CONTAINER_NAME('or')}
                    @decl(longhand or) container-name: entry__or 
                */
                container-name: or;

                /* 
                    @analyze-error(none ident) word(none) ${diagnostics.INVALID_CONTAINER_NAME(
                        'none'
                    )}
                    @decl(none ident) container-name: entry__xxx none
                */
                container-name: xxx none;

                /* 
                    @analyze-error(and) word(and) ${diagnostics.INVALID_CONTAINER_NAME('and')}
                    @decl(shorthand and) container: entry__and / normal 
                */
                container: and / normal;

                /* 
                    @analyze-error(shorthand none ident) word(none) ${diagnostics.INVALID_CONTAINER_NAME(
                        'none'
                    )}
                    @decl(shorthand none ident) container: entry__xxx none / normal
                */
                container: xxx none / normal;
            }
        `);
    });
    it('should transform namespace container name in @container', () => {
        const { sheets } = testStylableCore(`
            .a {
                container-name: aaa;
            }

            /* @atrule entry__aaa (inline-size > 100px) */
            @container aaa (inline-size > 100px) {}
        `);

        const { meta } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);
    });
    it('should transform build vars in @container query', () => {
        const { sheets } = testStylableCore(`
            :vars {
                size: 111px;
            }
            .a {
                container-name: aaa;
            }

            /* @atrule(build var) entry__aaa (inline-size > 111px) */
            @container aaa (inline-size > value(size)) {}
        `);

        const { meta } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);
    });
    it('should ignore symbol and use global in @container with st-global', () => {
        const { sheets } = testStylableCore(`
            .a {
                container-name: aaa;
            }

            /* @atrule(ignore existing) aaa (inline-size > 100px) */
            @container st-global(aaa) (inline-size > 100px) {}

            /* @atrule(refer to unknown) bbb (inline-size > 100px) */
            @container st-global(bbb) (inline-size > 100px) {}
        `);

        const { meta } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);
    });
    it('should report unresolved container name', () => {
        testStylableCore(`
            /* 
                @atrule aaa (inline-size > 100px) 
                @transform-error word(aaa) ${diagnostics.UNRESOLVED_CONTAINER_NAME('aaa')}
            */
            @container aaa (inline-size > 100px) {}
        `);
    });
    describe('st-import', () => {
        it('should resolve imported container name', () => {
            const { sheets } = testStylableCore({
                '/imported.st.css': `
                    .a {
                        container-name: c1, c2;
                    }
                `,
                '/entry.st.css': `
                    @st-import [container(c1, c2 as local-container)] from './imported.st.css';

                    /* @atrule(direct) imported__c1 (inline-size > 1px) */
                    @container c1 (inline-size > 1px) {}

                    /* @atrule(mapped) imported__c2 (inline-size > 2px) */
                    @container local-container (inline-size > 2px) {}
                `,
            });

            const { meta, exports } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            // symbols
            expect(CSSContains.get(meta, `c1`), `c1 symbol`).to.include({
                _kind: 'container',
                name: 'c1',
                alias: 'c1',
                global: false,
                import: meta.getImportStatements()[0],
            });
            expect(CSSContains.get(meta, `local-container`), `local-container symbol`).to.include({
                _kind: 'container',
                name: 'c2',
                alias: 'local-container',
                global: false,
                import: meta.getImportStatements()[0],
            });

            // JS exports
            expect(exports.containers, `JS exports`).to.eql({
                c1: `imported__c1`,
                'local-container': `imported__c2`,
            });
        });
        it('should report unknown container name', () => {
            testStylableCore({
                '/imported.st.css': ``,
                '/entry.st.css': `
                    /* @transform-error word(unknown) ${diagnostics.UNKNOWN_IMPORTED_CONTAINER(
                        `unknown`,
                        `./imported.st.css`
                    )} */
                    @st-import [container(unknown as local)] from './imported.st.css';
                `,
            });
        });
        it('should resolve imported global container name', () => {
            const { sheets } = testStylableCore({
                '/imported.st.css': `
                    .a {
                        container-name: st-global(c1);
                    }
                `,
                '/entry.st.css': `
                    @st-import [container(c1)] from './imported.st.css';

                    /* @atrule(direct) c1 (inline-size > 1px) */
                    @container c1 (inline-size > 1px) {}
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it('should override imported with local container name', () => {
            const { sheets } = testStylableCore({
                '/imported.st.css': `
                    .a {
                        container-name: before, after;
                    }
                `,
                '/entry.st.css': `
                    .a {
                        /* 
                            @analyze-warn(local before) word(before) ${stSymbolDiagnostics.REDECLARE_SYMBOL(
                                `before`
                            )}
                            @decl(before decl) container: entry__before 
                        */
                        container: before;
                    }
                    /* @atrule(before) entry__before (inline-size > 1px) */
                    @container before (inline-size > 1px) {}
                    
                    /*
                        @analyze-warn(import before) word(before) ${stSymbolDiagnostics.REDECLARE_SYMBOL(
                            `before`
                        )}
                        @analyze-warn(import after) word(after) ${stSymbolDiagnostics.REDECLARE_SYMBOL(
                            `after`
                        )}
                    */
                    @st-import [container(before, after)] from './imported.st.css';
                    
                    .a {
                        /* 
                            @analyze-warn(local after) word(after) ${stSymbolDiagnostics.REDECLARE_SYMBOL(
                                `after`
                            )}
                            @decl(after decl) container: entry__after 
                        */
                        container: after;
                    }
                    /* @atrule(after) entry__after (inline-size > 1px) */
                    @container after (inline-size > 1px) {}
                `,
            });

            const { meta, exports } = sheets['/entry.st.css'];

            // symbols
            expect(CSSContains.get(meta, `before`), `before symbol`).to.eql({
                _kind: 'container',
                alias: 'before',
                name: 'before',
                global: false,
                import: undefined,
            });
            expect(CSSContains.get(meta, `after`), `after symbol`).to.eql({
                _kind: 'container',
                alias: 'after',
                name: 'after',
                global: false,
                import: undefined,
            });

            // JS exports
            expect(exports.containers, `JS exports`).to.eql({
                before: `entry__before`,
                after: `entry__after`,
            });
        });
    });
    describe('st-mixin', () => {
        it('should mix @container for nested mixin', () => {
            const { sheets } = testStylableCore(
                deindent(`
                @container (inline-size > 1px) {
                    .before { id: before-in-container; }
                    .mix { id: mix-in-container; }
                    .after { id: after-in-container; }
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
                @container (inline-size > 1px) {
                    .entry__before { id: before-in-container; }
                    .entry__mix { id: mix-in-container; }
                    .entry__after { id: after-in-container; }
                }
                 .entry__into {
                }
                 @container (inline-size > 1px) {
                    .entry__into { id: mix-in-container; }
                }
            `)
            );
        });
    });
    describe('native css', () => {
        it('should not namespace', () => {
            const { stylable } = testStylableCore({
                '/native.css': deindent`
                    .x {
                        container-name: a;
                    }
                    @container a (inline-size > 100px) {}
                `,
                '/entry.st.css': `
                    @st-import [container(a)] from './native.css';

                    /* @atrule a (inline-size > 200px) */
                    @container a (inline-size > 200px) {}
                `,
            });

            const { meta: nativeMeta } = stylable.transform('/native.css');
            const { meta, exports } = stylable.transform('/entry.st.css');

            shouldReportNoDiagnostics(nativeMeta);
            shouldReportNoDiagnostics(meta);

            expect(nativeMeta.targetAst?.toString().trim(), 'no native transform').to.eql(
                deindent`
                    .x {
                        container-name: a;
                    }
                    @container a (inline-size > 100px) {}
            `.trim()
            );

            // JS exports
            expect(exports.containers, `JS export`).to.eql({
                a: 'a',
            });
        });
    });
});
