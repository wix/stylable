import { STSymbol, CSSKeyframes, STMixin } from '@stylable/core/dist/features';
import {
    testStylableCore,
    shouldReportNoDiagnostics,
    diagnosticBankReportToStrings,
    deindent,
} from '@stylable/core-test-kit';
import chai, { expect } from 'chai';
import chaiSubset from 'chai-subset';
chai.use(chaiSubset);

const mixinDiagnostics = diagnosticBankReportToStrings(STMixin.diagnostics);
const keyframesDiagnostics = diagnosticBankReportToStrings(CSSKeyframes.diagnostics);
const stSymbolDiagnostics = diagnosticBankReportToStrings(STSymbol.diagnostics);

describe(`features/css-keyframes`, () => {
    it(`should process @keyframes`, () => {
        const { sheets } = testStylableCore(`
            /* @atrule entry__frames-a */
            @keyframes frames-a {
                from{}
                to{}
            }
            
            /* @atrule entry__frames-b */
            @keyframes frames-b {
                from{}
                to{}
            }
        `);

        const { meta, exports } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        // symbols
        expect(CSSKeyframes.get(meta, `frames-a`), `frames-a symbol`).to.eql({
            _kind: 'keyframes',
            alias: 'frames-a',
            name: 'frames-a',
            global: undefined,
            import: undefined,
        });
        expect(CSSKeyframes.get(meta, `frames-b`), `frames-b symbol`).to.eql({
            _kind: 'keyframes',
            alias: 'frames-b',
            name: 'frames-b',
            global: undefined,
            import: undefined,
        });
        expect(CSSKeyframes.getAll(meta), `CSSKeyframes.getAll`).to.eql({
            'frames-a': CSSKeyframes.get(meta, `frames-a`),
            'frames-b': CSSKeyframes.get(meta, `frames-b`),
        });

        // JS exports
        expect(exports.keyframes[`frames-a`]).to.eql(`entry__frames-a`);
        expect(exports.keyframes[`frames-b`]).to.eql(`entry__frames-b`);

        // statements
        expect(
            CSSKeyframes.getKeyframesStatements(meta),
            `CSSKeyframes.getKeyframesStatements(meta)`,
        ).to.containSubset([meta.sourceAst.nodes[1], meta.sourceAst.nodes[3]]);
    });
    it(`should namespace "animation" and "animation-name" declarations`, () => {
        const { sheets } = testStylableCore(`
            .root {
                /* @decl(name) animation-name: entry__abc */
                animation-name: abc;

                /* @decl(single) animation: entry__abc */
                animation: abc;

                /* @decl(multiple) animation: 2s entry__abc infinite, 1s entry__def infinite */
                animation: 2s abc infinite, 1s def infinite;
            }
            
            @keyframes abc {
                from{}
                to{}
            }
            @keyframes def {
                from{}
                to{}
            }
        `);

        const { meta } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);
    });
    it(`should mark as global`, () => {
        const { sheets } = testStylableCore(`
            /* @atrule name */
            @keyframes st-global(name) {}    
        
            .root {
                /* @decl animation-name: name */
                animation-name: name;

                /* @decl(single) animation: name */
                animation: name;
            }
        `);

        const { meta, exports } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        // symbols
        expect(CSSKeyframes.get(meta, `name`), `symbol`).to.eql({
            _kind: 'keyframes',
            alias: 'name',
            name: 'name',
            global: true,
            import: undefined,
        });

        // JS exports
        expect(exports.keyframes.name, `JS export`).to.eql(`name`);
    });
    it('should report invalid cases', () => {
        const { sheets } = testStylableCore(`
            /* @analyze-error(empty name) ${keyframesDiagnostics.MISSING_KEYFRAMES_NAME()} */
            @keyframes {}
            
            /* @analyze-error(empty global) ${keyframesDiagnostics.MISSING_KEYFRAMES_NAME_INSIDE_GLOBAL()} */
            @keyframes st-global() {}
        `);

        const { meta } = sheets['/entry.st.css'];

        expect(meta.targetAst?.nodes[1]?.toString()).to.eql(`@keyframes {}`);
    });
    it('should report reserved @keyframes names', () => {
        CSSKeyframes.reservedKeyFrames.map((reserved) => {
            testStylableCore(`
                /* @analyze-error(${reserved}) word(${reserved}) ${keyframesDiagnostics.KEYFRAME_NAME_RESERVED(
                    reserved,
                )} */
                @keyframes ${reserved} {}
            `);
        });
    });
    it(`should not namespace nested rules within @keyframes`, () => {
        // ToDo: move transform filtering into feature
        // ToDo: missing check for the nested rules filter in processor
        // ToDo: make sure this is actually testing anything: "from" and "to" wouldn't be namespaces anyhow
        const { sheets } = testStylableCore(`
            @keyframes name {
                /* @rule from */
                from {}
                /* @rule to */
                to {
                    /* @rule deep */
                    deep {}
                }
            }
        `);

        const { meta } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);
    });
    it(`should only be placed under root or conditional rules`, () => {
        const { sheets } = testStylableCore(`
            @keyframes on-root {}

            @media (width-min: 1px) {
                @keyframes on-media {}
            }

            @supports (display: grid) {
                @keyframes on-supports {}
            }

            .root {
                /* @analyze-error ${keyframesDiagnostics.ILLEGAL_KEYFRAMES_NESTING()} */
                @keyframes not-valid {}
            }
        `);

        expect(sheets[`/entry.st.css`].meta.diagnostics.reports.length).to.eql(1);
    });
    it.skip(`should escape invalid inputs`, () => {
        const { sheets } = testStylableCore(
            `
            /* @check(statement) a\\|a__a */
            @keyframes a {
                from {}
                to {}
            }
            
            /* @check(decl) .a\\|a__x {
                animation-name: a\\|a__a;
            }*/
            .x {
                animation-name: a;
            }
        `,
            {
                stylableConfig: {
                    resolveNamespace() {
                        return `a|a`;
                    },
                },
            },
        );

        const { meta, exports } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        // JS exports
        expect(exports.keyframes, `JS export`).to.eql({
            a: 'a\\|a__a',
        });
    });
    it(`should not conflict with other symbol types`, () => {
        const { sheets } = testStylableCore(`
            @keyframes anim {}

            /* @rule .entry__anim */
            .anim {
                /* @decl animation: entry__anim */
                animation: anim;
            }
        `);

        const { meta } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);
    });
    describe(`multiple @keyframes`, () => {
        it(`should warn on redeclare keyframes in root`, () => {
            testStylableCore(`
                /* @analyze-warn word(a) ${stSymbolDiagnostics.REDECLARE_SYMBOL(`a`)} */
                @keyframes a {}

                /* @analyze-warn word(a) ${stSymbolDiagnostics.REDECLARE_SYMBOL(`a`)} */
                @keyframes a {}
            `);
        });
        it(`should warn on redeclare keyframes in identical @media nesting`, () => {
            testStylableCore(`
                @media (max-width: 1px) {
                    /* @analyze-warn word(a) ${stSymbolDiagnostics.REDECLARE_SYMBOL(`a`)} */
                    @keyframes a {}
                }
                @media (max-width: 1px) {
                    /* @analyze-warn word(a) ${stSymbolDiagnostics.REDECLARE_SYMBOL(`a`)} */
                    @keyframes a {}

                    /* @analyze-warn word(a) ${stSymbolDiagnostics.REDECLARE_SYMBOL(`a`)} */
                    @keyframes a {}
                }
            `);
        });
        it(`should not warn on redeclare keyframes under different @media`, () => {
            const { sheets } = testStylableCore(`
                @keyframes a {}

                @media (max-width: 1px) {
                    @keyframes a {}
                }

                @media (max-width: 2px) {
                    @keyframes a {}
                }
            `);

            shouldReportNoDiagnostics(sheets[`/entry.st.css`].meta);
        });
    });
    describe(`st-import`, () => {
        it(`should resolve imported @keyframes`, () => {
            const { sheets } = testStylableCore({
                '/imported.st.css': `
                    @keyframes anim1 {}
                    @keyframes anim2 {}
                `,
                '/entry.st.css': `
                    @st-import [keyframes(anim1, anim2 as local-anim)] from './imported.st.css';

                    .selector {
                        /* @decl(direct) animation: imported__anim1 */
                        animation: anim1;

                        /* @decl(mapped) animation: imported__anim2 */
                        animation: local-anim;
                    }
                `,
            });

            const { meta, exports } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            // symbols
            expect(CSSKeyframes.get(meta, `anim1`), `anim1 symbol`).to.include({
                _kind: 'keyframes',
                name: 'anim1',
                alias: 'anim1',
                global: undefined,
                import: meta.getImportStatements()[0],
            });
            expect(CSSKeyframes.get(meta, `local-anim`), `local-anim symbol`).to.include({
                _kind: 'keyframes',
                name: 'anim2',
                alias: 'local-anim',
                global: undefined,
                import: meta.getImportStatements()[0],
            });

            // JS exports
            expect(exports.keyframes, `expose only locals to runtime`).to.eql({});
        });
        it(`should resolve imported global @keyframes`, () => {
            const { sheets } = testStylableCore({
                '/imported.st.css': `
                    @keyframes st-global(anim1) {}
                    @keyframes st-global(anim2) {}
                `,
                '/entry.st.css': `
                    @st-import [keyframes(anim1, anim2 as local-anim)] from './imported.st.css';

                    .selector {
                        /* @decl(direct) animation: anim1 */
                        animation: anim1;

                        /* @decl(mapped) animation: anim2 */
                        animation: local-anim;
                    }
                `,
            });

            const { meta, exports } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            // symbols
            expect(CSSKeyframes.get(meta, `anim1`), `anim1 symbol`).to.include({
                _kind: 'keyframes',
                name: 'anim1',
                alias: 'anim1',
                global: undefined,
                import: meta.getImportStatements()[0],
            });
            expect(CSSKeyframes.get(meta, `local-anim`), `local-anim symbol`).to.include({
                _kind: 'keyframes',
                name: 'anim2',
                alias: 'local-anim',
                global: undefined,
                import: meta.getImportStatements()[0],
            });

            // JS exports
            expect(exports.keyframes, `expose only locals to runtime`).to.eql({});
        });
        it(`should override imported with local @keyframes`, () => {
            const { sheets } = testStylableCore({
                '/imported.st.css': `
                    @keyframes before {}
                    @keyframes after {}
                `,
                '/entry.st.css': `
                    .root {
                        /* @decl(before decl) animation: entry__before */
                        animation: before;
                    }

                    /* 
                        @atrule entry__before
                        @analyze-warn(local before) word(before) ${stSymbolDiagnostics.REDECLARE_SYMBOL(
                            `before`,
                        )}
                    */
                    @keyframes before {}
                    
                    /*
                        @analyze-warn(import before) word(before) ${stSymbolDiagnostics.REDECLARE_SYMBOL(
                            `before`,
                        )}
                        @analyze-warn(import after) word(after) ${stSymbolDiagnostics.REDECLARE_SYMBOL(
                            `after`,
                        )}
                    */
                    @st-import [keyframes(before, after)] from './import.st.css';
                    
                    /* 
                        @atrule entry__after
                        @analyze-warn(local after) word(after) ${stSymbolDiagnostics.REDECLARE_SYMBOL(
                            `after`,
                        )}
                    */
                    @keyframes after {}

                    .root {
                        /* @decl(after decl) animation: entry__after */
                        animation: after;
                    }
                `,
            });

            const { meta, exports } = sheets['/entry.st.css'];

            // symbols
            expect(CSSKeyframes.get(meta, `before`), `before symbol`).to.eql({
                _kind: 'keyframes',
                alias: 'before',
                name: 'before',
                global: undefined,
                import: undefined,
            });
            expect(CSSKeyframes.get(meta, `after`), `after symbol`).to.eql({
                _kind: 'keyframes',
                alias: 'after',
                name: 'after',
                global: undefined,
                import: undefined,
            });

            // JS exports
            expect(exports.keyframes, `JS exports`).to.eql({
                before: `entry__before`,
                after: `entry__after`,
            });
        });
        it(`should report unknown @keyframes import`, () => {
            const { sheets } = testStylableCore({
                '/imported.st.css': ``,
                '/entry.st.css': `
                    /* @transform-error word(unknown) ${keyframesDiagnostics.UNKNOWN_IMPORTED_KEYFRAMES(
                        `unknown`,
                        `./imported.st.css`,
                    )} */
                    @st-import [keyframes(unknown as local)] from './imported.st.css';
                `,
            });

            const { meta, exports } = sheets['/entry.st.css'];

            // symbols
            expect(CSSKeyframes.get(meta, `local`), `symbol`).to.include({
                _kind: 'keyframes',
                name: 'unknown',
                alias: 'local',
                global: undefined,
                import: meta.getImportStatements()[0],
            });

            // JS exports
            expect(exports.keyframes, `JS exports`).to.eql({});
        });
        it(`should not conflict with other imported symbol types`, () => {
            const { sheets } = testStylableCore({
                '/imported.st.css': `
                    .anim {}
                    @keyframes anim {}
                `,
                '/entry.st.css': `
                    @st-import [anim, keyframes(anim)] from './imported.st.css';
                    
                    /* @rule .entry__root .imported__anim */
                    .root .anim {
                        /* @decl animation: imported__anim */
                        animation: anim;
                    }
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
    });
    describe(`st-mixin`, () => {
        it(`should mix local class referring to local @keyframes`, () => {
            const { sheets } = testStylableCore(`
                .mix {
                    animation: jump;
                }
                @keyframes jump {}
                
                /* 
                @rule .entry__a { animation: entry__jump; } 
                */
                .a {
                    -st-mixin: mix;
                }
            `);

            expect(
                sheets[`/entry.st.css`].meta.targetAst?.toString().match(/@keyframes/g)!.length,
                `only original @keyframes`,
            ).to.eql(1);
        });
        it(`should mix class with mixin context @keyframes`, () => {
            const { sheets } = testStylableCore({
                '/imported.st.css': `
                    .mix {
                        animation: jump;
                    }
                    @keyframes jump {}
                `,
                '/entry.st.css': `
                    @st-import [mix] from './imported.st.css';
                    
                    /* 
                    @rule .entry__a { animation: imported__jump; } 
                    */
                    .a {
                        -st-mixin: mix;
                    }
                `,
            });

            expect(
                sheets[`/entry.st.css`].meta.targetAst?.toString(),
                `@keyframes referenced & not copied`,
            ).to.not.include(`@keyframes`);
        });
        it(`should mix root with with copy of @keyframes`, () => {
            // ToDo(bug): fix copied @keyframes to be namespaced by entry or use reference
            // should be `animation: entry__jump` and `@keyframes entry__jump` or reference to imported__jump
            const { sheets } = testStylableCore({
                '/imported.st.css': `
                    .root {
                        animation: jump;
                    }
                    @keyframes jump {}
                `,
                '/entry.st.css': `
                    @st-import Mix from './imported.st.css';
                    
                    /* 
                    @rule(reference animation name) .entry__a { animation: imported__jump; } 
                    @rule[1](mixed-in @keyframes) imported__jump
                    */
                    .a {
                        -st-mixin: Mix;
                    }
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it(`should handle @keyframes in Javascript mixin`, () => {
            // ToDo: fix symbols inside mixin - animation-name
            // should match between @keyframes and declarations.
            testStylableCore({
                '/mixin.js': `
                    module.exports = function() {
                        return {
                            "animation": [
                                "unknown",
                                "conflict",
                                "global-name",
                            ],
                            "@keyframes unknown": {},
                            "@keyframes conflict": {},
                            "@keyframes st-global(global-name)": {},
                        }
                    }
                `,
                '/entry.st.css': `
                    @st-import mix from './mixin';
                    
                    /* @atrule(stay global) conflict */
                    @keyframes st-global(conflict) {}

                    /* 
                        @rule[0] .entry__a {
                            animation: unknown;
                            animation: conflict;
                            animation: global-name;
                        }
                        @rule(ns for sheet)[1] entry__unknown
                        @rule(global by sheet)[2] conflict
                        @rule(global by mixin)[3] global-name
                    */
                    .a {
                        -st-mixin: mix;
                    }
                `,
            });
        });
        it(`should not mix rules/atrules into keyframe`, () => {
            testStylableCore(`
                .mix {
                    color: green;
                }
                .mix:hover {
                    color: red;
                }
                
                @keyframes move {
                    /* 
                        @transform-error ${mixinDiagnostics.INVALID_MERGE_OF(
                            `0%:hover {
                    color: red;
                }`,
                        )}
                        @rule[0] 0% { color: green } 
                        @rule[1] 100% { } 
                    */
                    0% { -st-mixin: mix; }
                    100% {}
                }
            `);
        });
    });
    describe('native css', () => {
        it('should not namespace', () => {
            const { stylable } = testStylableCore({
                '/native.css': deindent(`
                    @keyframes jump {}
                    .x {
                        animation: jump;
                    }
                `),
                '/entry.st.css': `
                    @st-import [keyframes(jump)] from './native.css';

                    .root {
                        /* @decl animation: jump */
                        animation: jump;
                    }
                `,
            });

            const { meta: nativeMeta } = stylable.transform('/native.css');
            const { meta, exports } = stylable.transform('/entry.st.css');

            shouldReportNoDiagnostics(nativeMeta);
            shouldReportNoDiagnostics(meta);

            expect(nativeMeta.targetAst?.toString().trim(), 'no native transform').to.eql(
                deindent(`
                    @keyframes jump {}
                    .x {
                        animation: jump;
                    }
                `),
            );

            // JS exports
            expect(exports.keyframes, `expose only locals to runtime`).to.eql({});
        });
        it('should ignore stylable specific transformations', () => {
            const { stylable } = testStylableCore({
                '/native.css': '@keyframes st-global(name) {}',
            });

            const { meta: nativeMeta } = stylable.transform('/native.css');

            expect(nativeMeta.targetAst?.toString().trim(), 'no native transform').to.eql(
                '@keyframes st-global(name) {}',
            );
        });
    });
});
