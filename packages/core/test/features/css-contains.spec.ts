import { STSymbol, CSSContains } from '@stylable/core/dist/features';
import {
    testStylableCore,
    shouldReportNoDiagnostics,
    diagnosticBankReportToStrings,
    deindent,
} from '@stylable/core-test-kit';
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
    it('should allow use of global names without symbol creation', () => {
        const { sheets } = testStylableCore(`
            .a {
                /* @decl(longhand) container-name: a */
                container-name: st-global(a);

                /* @decl(longhand multiple) container-name: a b */
                container-name: st-global(a) st-global(b);

                /* @decl(shorthand) container: c / normal */
                container: st-global(c) / normal;

                /* @decl(shorthand) container: d e / normal */
                container: st-global(d) st-global(e) / normal;

                /* @decl(unrelated) container-name: entry__a entry__z */
                container-name: a z;
            }
        `);

        const { meta, exports } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        // symbols
        expect(CSSContains.get(meta, 'a'), 'a symbol').to.eql({
            _kind: 'container',
            name: 'a',
            alias: 'a',
            global: false,
            import: undefined,
        });
        expect(CSSContains.get(meta, 'z'), 'z symbol').to.eql({
            _kind: 'container',
            name: 'z',
            alias: 'z',
            global: false,
            import: undefined,
        });

        // JS exports
        expect(exports.containers).to.eql({
            a: 'entry__a',
            z: 'entry__z',
        });
    });
    it('should define container name with @container with no body', () => {
        const { sheets } = testStylableCore(`
            /* @transform-remove */
            @container st-global(aaa);
        
            .a {
                /* @decl container-name: aaa */
                container-name: aaa;
            }

            /* @atrule aaa (inline-size > 100px) */
            @container aaa (inline-size > 100px) {}
        `);

        const { meta, exports } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        // symbols
        expect(CSSContains.get(meta, 'aaa'), 'aaa symbol').to.eql({
            _kind: 'container',
            name: 'aaa',
            alias: 'aaa',
            global: true,
            import: undefined,
        });

        // JS exports
        expect(exports.containers).to.eql({
            aaa: 'aaa',
        });
    });
    it('should report invalid decls', () => {
        testStylableCore(`
            .a {
                /* 
                    @analyze-error(longhand unexpected) word("?") ${diagnostics.UNEXPECTED_DECL_VALUE(
                        '"?"'
                    )}
                    @decl(longhand unexpected) container-name: entry__a "?" not_a_container_name
                */
                container-name: a "?" not_a_container_name;
                
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
                    @decl(shorthand unexpected) container: entry__a "?" b
                */
                container: a "?" b;

                /* 
                    @analyze-warning(empty global) ${diagnostics.MISSING_CONTAINER_NAME_INSIDE_GLOBAL()}
                    @decl(empty global) container-name: 
                */
                container-name: st-global();
            }
        `);
    });
    it('should report redeclare container name', () => {
        testStylableCore(`
            /* @analyze-warning(same1) ${stSymbolDiagnostics.REDECLARE_SYMBOL(`aaa`)} */
            @container aaa;

            /* @analyze-warning(same2) ${stSymbolDiagnostics.REDECLARE_SYMBOL(`aaa`)} */
            @container aaa;

            /* @analyze-warning(namespaced) ${stSymbolDiagnostics.REDECLARE_SYMBOL(`bbb`)} */
            @container bbb;

            /* @analyze-warning(global) ${stSymbolDiagnostics.REDECLARE_SYMBOL(`bbb`)} */
            @container st-global(bbb);
        `);
    });
    it('should report unexpected @container definition value', () => {
        testStylableCore(`
            /* 
                @analyze-error(string) ${diagnostics.UNEXPECTED_DEFINITION('"str"')} 
            */
            @container "str";

            /* 
                @analyze-error(div) ${diagnostics.UNEXPECTED_DEFINITION('+')} 
            */
            @container contA +;
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

            /* @analyze-error(hard-def and) word(and) ${diagnostics.INVALID_CONTAINER_NAME(
                'and'
            )} */
            @container and;

            /* @analyze-error(hard-def not) word(not) ${diagnostics.INVALID_CONTAINER_NAME(
                'not'
            )} */
            @container not;

            /* @analyze-error(hard-def or) word(or) ${diagnostics.INVALID_CONTAINER_NAME('or')} */
            @container or;
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
                        container-name: c1 c2;
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
            expect(exports.containers, `JS exports only locals`).to.eql({});
        });
        it(`should NOT expose imported symbols properties to runtime`, () => {
            const { sheets } = testStylableCore({
                '/containers.st.css': `
                    .root {
                        container-name: x y;
                    }
                `,
                '/entry.st.css': `
                    @st-import [container(x, y as localY)] from './containers.st.css';
                    
                    @container x (inline-size > 1px) {}
                    @container localY (inline-size > 1px) {}
                `,
            });

            const { meta, exports } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            // JS exports
            expect(exports.containers).to.eql({});
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
        it('should report redeclare of imported container name', () => {
            const { sheets } = testStylableCore({
                '/a.st.css': `
                    .root {
                        container-name: x;
                    }
                `,
                '/b.st.css': `
                    .root {
                        container-name: x;
                    }
                `,
                '/entry.st.css': `
                    /* @analyze-warn(a) word(x) ${stSymbolDiagnostics.REDECLARE_SYMBOL(`x`)} */
                    @st-import [container(x)] from './a.st.css';

                    /* @analyze-warn(b) word(x) ${stSymbolDiagnostics.REDECLARE_SYMBOL(`x`)} */
                    @st-import [container(x)] from './b.st.css';
                    
                    .a {
                        /* @decl container: b__x */
                        container: x;
                    }
                    /* @atrule b__x (inline-size > 1px) */
                    @container x (inline-size > 1px) {}
                `,
            });

            const { meta, exports } = sheets['/entry.st.css'];

            // symbols
            expect(CSSContains.get(meta, `x`), `x symbol`).to.eql({
                _kind: 'container',
                alias: 'x',
                name: 'x',
                global: false,
                import: meta.getImportStatements()[1],
            });

            // JS exports
            expect(exports.containers, `JS exports only locals`).to.eql({});
        });
        it('should resolve imported global container name', () => {
            const { sheets } = testStylableCore({
                '/imported.st.css': `
                    @container st-global(c1);
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
        it('should use imported container name', () => {
            const { sheets } = testStylableCore({
                '/imported.st.css': `
                    .a {
                        container-name: before after;
                    }
                `,
                '/entry.st.css': `
                    .a {
                        /* @decl(before decl) container: imported__before */
                        container: before;
                    }
                    /* @atrule(before) imported__before (inline-size > 1px) */
                    @container before (inline-size > 1px) {}
                    
                    @st-import [container(before, after)] from './imported.st.css';
                    
                    .a {
                        /* @decl(after decl) container: imported__after */
                        container: after;
                    }
                    /* @atrule(after) imported__after (inline-size > 1px) */
                    @container after (inline-size > 1px) {}
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            // symbols
            expect(CSSContains.get(meta, `before`), `before symbol`).to.eql({
                _kind: 'container',
                alias: 'before',
                name: 'before',
                global: false,
                import: meta.getImportStatements()[0],
            });
            expect(CSSContains.get(meta, `after`), `after symbol`).to.eql({
                _kind: 'container',
                alias: 'after',
                name: 'after',
                global: false,
                import: meta.getImportStatements()[0],
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
                '/native.css': deindent(`
                    .x {
                        container-name: a;
                    }
                    @container a (inline-size > 100px) {}
                `),
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
                deindent(`
                    .x {
                        container-name: a;
                    }
                    @container a (inline-size > 100px) {}
                `)
            );

            // JS exports
            expect(exports.containers, `JS export only locals`).to.eql({});
        });
    });
});
