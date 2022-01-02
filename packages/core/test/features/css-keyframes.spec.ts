import { STSymbol, CSSKeyframes } from '@stylable/core/dist/features';
import { ignoreDeprecationWarn } from '@stylable/core/dist/helpers/deprecation';
import {
    generateStylableRoot,
    generateStylableResult,
    generateStylableExports,
    testInlineExpects,
    expectAnalyzeDiagnostics,
    expectTransformDiagnostics,
} from '@stylable/core-test-kit';
import chai, { expect } from 'chai';
import chaiSubset from 'chai-subset';
chai.use(chaiSubset);

describe(`features/css-keyframes`, () => {
    describe(`meta`, () => {
        it('should collect @keyframes statements', () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: `entry`,
                        content: `
                        @keyframes name {
                            from{}
                            to{}
                        }
                        @keyframes anther-name {
                            from{}
                            to{}
                        }
                        `,
                    },
                },
            });

            expect(
                CSSKeyframes.getKeyframesStatements(meta),
                `CSSKeyframes.getKeyframesStatements(meta)`
            ).to.containSubset([meta.ast.nodes[0], meta.ast.nodes[1]]);

            // deprecation
            ignoreDeprecationWarn(() => {
                expect(meta.keyframes.length).to.eql(2);
            });
        });
        it(`should add keyframes symbols`, () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: `entry`,
                        content: `
                            @keyframes a {}
                            @keyframes b {}
                        `,
                    },
                },
            });
            expect(CSSKeyframes.get(meta, `a`), `a`).to.eql({
                _kind: 'keyframes',
                alias: 'a',
                name: 'a',
                global: undefined,
                import: undefined,
            });
            expect(CSSKeyframes.get(meta, `b`), `b`).to.eql({
                _kind: 'keyframes',
                alias: 'b',
                name: 'b',
                global: undefined,
                import: undefined,
            });
            expect(CSSKeyframes.getAll(meta), `CSSKeyframes.getAll`).to.eql({
                a: CSSKeyframes.get(meta, `a`),
                b: CSSKeyframes.get(meta, `b`),
            });
            // deprecation
            ignoreDeprecationWarn(() => {
                expect(meta.mappedKeyframes.a, `deprecated`).to.equal(CSSKeyframes.get(meta, `a`));
            });
        });
        it('should collect global keyframes symbols', () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: `entry`,
                        content: `
                        @keyframes st-global(name) {
                            from{}
                            to{}
                        }
                    `,
                    },
                },
            });

            expect(CSSKeyframes.get(meta, `name`)).to.eql({
                _kind: 'keyframes',
                alias: 'name',
                name: 'name',
                global: true,
                import: undefined,
            });
        });
        describe(`st-import`, () => {
            it(`should add imported keyframes symbols`, () => {
                const { meta } = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: `entry`,
                            content: `
                            @st-import [keyframes(a, b-origin as b-local)] from "./path";
                            `,
                        },
                    },
                });

                expect(CSSKeyframes.get(meta, `a`)).to.include({
                    _kind: 'keyframes',
                    name: 'a',
                });
                expect(CSSKeyframes.get(meta, `b-local`)).to.include({
                    _kind: 'keyframes',
                    name: 'b-origin',
                    alias: 'b-local',
                    global: undefined,
                    import: meta.getImportStatements()[0],
                });
            });
        });
    });
    describe(`transform`, () => {
        it('should namespace @keyframes statements and "animation-name" values', () => {
            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            /* @check(a statement) entry__a */
                            @keyframes a {
                                from {}
                                to {}
                            }
                            
                            /* @check(b statement) entry__b */
                            @keyframes b {
                                from {}
                                to {}
                            }

                            /* @check(animation-name longhand) .entry__x {
                                animation-name: entry__a;
                            }*/
                            .x {
                                animation-name: a;
                            }

                            /* @check(animation shorthand) .entry__x {
                                animation: 2s entry__a infinite, 1s entry__b infinite;
                            }*/
                            .x {
                                animation: 2s a infinite, 1s b infinite;
                            }
                        `,
                    },
                },
            });

            testInlineExpects(result);
        });
        it('should not namespace nested rules within keyframes', () => {
            // ToDo: move transform filtering into feature
            // ToDo: missing check for the nested rules filter in processor
            // ToDo: make sure this is actually testing anything: "from" and "to" wouldn't be namespaces anyhow
            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            @keyframes name {
                                /* @check from */
                                from {}
                                /* @check to */
                                to {}
                            }
                        `,
                    },
                },
            });

            testInlineExpects(result);
        });
        it('should not transform global keyframes', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'style',
                        content: `
                        /* @check global-name */
                        @keyframes st-global(global-name) {
                            from {}
                            to {}
                        }
                        `,
                    },
                },
            });

            testInlineExpects(result);
        });
        describe(`st-import`, () => {
            it('should namespace imported animation and animation name', () => {
                const result = generateStylableRoot({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                :import {
                                    -st-from: './imported.st.css';
                                    -st-named: keyframes(anim1, anim2 as anim3);
                                }
                                /* @check .entry__selector {
                                    animation: 2s imported__anim1 infinite, 1s imported__anim2 infinite;
                                    animation-name: imported__anim1
                                } */
                                .selector {
                                    animation: 2s anim1 infinite, 1s anim3 infinite;
                                    animation-name: anim1;
                                }
    
                            `,
                        },
                        '/imported.st.css': {
                            namespace: 'imported',
                            content: `
                                @keyframes anim1 {
                                    from {}
                                    to {}
                                }
    
                                @keyframes anim2 {
                                    from {}
                                    to {}
                                }
    
                            `,
                        },
                    },
                });

                testInlineExpects(result);
            });
            it('should import global keyframes', () => {
                const config = {
                    entry: `/style.st.css`,
                    files: {
                        '/style.st.css': {
                            namespace: 'style',
                            content: `
                            @st-import [keyframes(globalName)] from "./a.st.css";
    
                            /* @check .style__x {animation-name: globalName;} */
                            .x {
                                animation-name: globalName;
                            }
                            `,
                        },
                        '/a.st.css': {
                            namespace: 'a',
                            content: `
                            @keyframes st-global(globalName) {
                                from {}
                                to {}
                            }
                            `,
                        },
                    },
                };

                testInlineExpects(generateStylableRoot(config));
                expectTransformDiagnostics(config, []);
            });
            it('should import global keyframes with mapped local name', () => {
                const config = {
                    entry: `/style.st.css`,
                    files: {
                        '/style.st.css': {
                            namespace: 'style',
                            content: `
                            @st-import [keyframes(globalName as bar)] from "./a.st.css";
    
                            /* @check .style__foo {animation-name: globalName;} */
                            .foo {
                                animation-name: bar;
                            }
                            `,
                        },
                        '/a.st.css': {
                            namespace: 'a',
                            content: `
                            @keyframes st-global(globalName) {
                                from {}
                                to {}
                            }
                            
                            `,
                        },
                    },
                };

                testInlineExpects(generateStylableRoot(config));
                expectTransformDiagnostics(config, []);
            });
            it('should not conflict with other named parts', () => {
                const result = generateStylableRoot({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                :import {
                                    -st-from: './imported.st.css';
                                    -st-named: anim1, keyframes(anim1);
                                }
                                /* @check .entry__selector {
                                    animation: 2s imported__anim1 infinite;
                                    animation-name: imported__anim1;
                                } */
                                .selector {
                                    animation: 2s anim1 infinite;
                                    animation-name: anim1;
                                }
                                /* @check .imported__anim1 */
                                .anim1{}
                            `,
                        },
                        '/imported.st.css': {
                            namespace: 'imported',
                            content: `
                                @keyframes anim1 {
                                    from {}
                                    to {}
                                }
                                .anim1 {}
                            `,
                        },
                    },
                });
                testInlineExpects(result);
            });
            it(`should override import with local statement`, () => {
                const root = generateStylableRoot({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: `entry`,
                            content: `
                                /* @check entry__before */
                                @keyframes before {}

                                @st-import [keyframes(before, after)] from './import.st.css';
                                
                                /* @check entry__after */
                                @keyframes after {}
                            `,
                        },
                        '/import.st.css': {
                            namespace: `import`,
                            content: `
                            @keyframes before {}
                            @keyframes after {}`,
                        },
                    },
                });

                testInlineExpects(root);
            });
            describe(`JS exports`, () => {
                it('should contain local keyframes', () => {
                    const cssExports = generateStylableExports({
                        entry: '/entry.st.css',
                        files: {
                            '/entry.st.css': {
                                namespace: 'entry',
                                content: `
                                    @keyframes name {
        
                                    }
                                `,
                            },
                        },
                    });

                    expect(cssExports.keyframes).to.eql({
                        name: 'entry__name',
                    });
                });
                it('should contain imported keyframes', () => {
                    const cssExports = generateStylableExports({
                        entry: '/entry.st.css',
                        files: {
                            '/entry.st.css': {
                                namespace: 'entry',
                                content: `
                                    :import {
                                        -st-from: "./imported.st.css";
                                        -st-named: keyframes(name);
                                    }
                                `,
                            },
                            '/imported.st.css': {
                                namespace: 'imported',
                                content: `
                                    @keyframes name {}
                                `,
                            },
                        },
                    });

                    expect(cssExports.keyframes).to.eql({
                        name: 'imported__name',
                    });
                });
                it('should contain imported keyframe with mapped local name', () => {
                    const cssExports = generateStylableExports({
                        entry: '/entry.st.css',
                        files: {
                            '/entry.st.css': {
                                namespace: 'entry',
                                content: `
                                    :import {
                                        -st-from: "./imported.st.css";
                                        -st-named: keyframes(name as myName);
                                    }
                                `,
                            },
                            '/imported.st.css': {
                                namespace: 'imported',
                                content: `
                                    @keyframes name {}
                                `,
                            },
                        },
                    });

                    expect(cssExports.keyframes).to.eql({
                        myName: 'imported__name',
                    });
                });
                it('should have local keyframes override imported ones', () => {
                    const cssExports = generateStylableExports({
                        entry: '/entry.st.css',
                        files: {
                            '/entry.st.css': {
                                namespace: 'entry',
                                content: `
                                    :import {
                                        -st-from: "./imported.st.css";
                                        -st-named: keyframes(name);
                                    }
                                    @keyframes name {}
                                `,
                            },
                            '/imported.st.css': {
                                namespace: 'imported',
                                content: `
                                    @keyframes name {}
                                `,
                            },
                        },
                    });

                    expect(cssExports.keyframes).to.eql({
                        name: 'entry__name',
                    });
                });
                it('should not namespace imported global keyframes', () => {
                    const config = {
                        entry: `/style.st.css`,
                        files: {
                            '/style.st.css': {
                                namespace: 'style',
                                content: `
                                @keyframes st-global(globalName) {
                                    from {}
                                    to {}
                                }
                                `,
                            },
                        },
                    };

                    const cssExports = generateStylableExports(config);

                    expect(cssExports.keyframes).to.eql({
                        globalName: 'globalName',
                    });
                });
            });
        });
        describe(`escape`, () => {
            it.skip(`should escape invlid inputs`, () => {
                const { meta, exports } = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'a|a',
                            content: `
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
                        },
                    },
                });

                testInlineExpects(meta.outputAst!);
                expect(exports.keyframes, `JS export`).to.eql({
                    a: 'a\\|a__a',
                });
            });
        });
    });
    describe(`diagnostics`, () => {
        it('should warn on missing keyframes name', () => {
            expectAnalyzeDiagnostics(`|@keyframes |{}`, [
                {
                    message: CSSKeyframes.diagnostics.MISSING_KEYFRAMES_NAME(),
                    severity: `warning`,
                    file: '/entry.st.css',
                },
            ]);
        });
        it('should not allow reserved words as @keyframes name', () => {
            CSSKeyframes.reservedKeyFrames.map((key) => {
                expectAnalyzeDiagnostics(
                    `
                    |@keyframes $${key}$| {
                        from {}
                        to {}
                    },
                `,
                    [
                        {
                            message: CSSKeyframes.diagnostics.KEYFRAME_NAME_RESERVED(key),
                            severity: `error`,
                            file: '/entry.st.css',
                        },
                    ]
                );
            });
        });
        it('should warn on missing keyframes parameter inside st-global', () => {
            const meta = expectAnalyzeDiagnostics(`|@keyframes st-global()| {}`, [
                {
                    message: CSSKeyframes.diagnostics.MISSING_KEYFRAMES_NAME_INSIDE_GLOBAL(),
                    severity: `warning`,
                    file: '/entry.st.css',
                },
            ]);
            expect(CSSKeyframes.getAll(meta), `no keyframes symbols`).to.eql({});
        });
        it('should error when not directly placed under root or conditional rules', () => {
            expectAnalyzeDiagnostics(
                `
                @keyframes on-root {}
                @media (width-min: 1px) {
                    @keyframes on-media {}
                }
                @supports (display: grid) {
                    @keyframes on-supports {}
                }
                .root {
                    |@keyframes not-valid| {}
                }
                `,
                [
                    {
                        message: CSSKeyframes.diagnostics.ILLEGAL_KEYFRAMES_NESTING(),
                        severity: `error`,
                        file: '/entry.st.css',
                    },
                ]
            );
        });
        it('should warn on redeclare keyframes in root', () => {
            expectAnalyzeDiagnostics(
                `
                |@keyframes a|{}
                @keyframes a{}
                `,
                [
                    {
                        message: STSymbol.diagnostics.REDECLARE_SYMBOL(`a`),
                        severity: `warning`,
                        file: '/entry.st.css',
                    },
                    {
                        message: STSymbol.diagnostics.REDECLARE_SYMBOL(`a`),
                        severity: `warning`,
                        file: '/entry.st.css',
                        skipLocationCheck: true,
                    },
                ]
            );
        });
        it('should warn on redeclare keyframes in the identical @media nesting', () => {
            expectAnalyzeDiagnostics(
                `
                @media (max-width: 1px) {
                    |@keyframes a|{}
                }
                @media (max-width: 1px) {
                    @keyframes a{}
                    @keyframes a{}
                }
                `,
                [
                    {
                        message: STSymbol.diagnostics.REDECLARE_SYMBOL(`a`),
                        severity: `warning`,
                        file: '/entry.st.css',
                    },
                    {
                        message: STSymbol.diagnostics.REDECLARE_SYMBOL(`a`),
                        severity: `warning`,
                        file: '/entry.st.css',
                        skipLocationCheck: true,
                    },
                    {
                        message: STSymbol.diagnostics.REDECLARE_SYMBOL(`a`),
                        severity: `warning`,
                        file: '/entry.st.css',
                        skipLocationCheck: true,
                    },
                ]
            );
        });
        it('should not warn on redeclare keyframes under different @media at-rules', () => {
            expectAnalyzeDiagnostics(
                `
                @keyframes a{}
                @media (max-width: 1px) {
                    @keyframes a{}
                }
                @media (max-width: 2px) {
                    @keyframes a{}
                }
                `,
                []
            );
        });
        describe(`st-import`, () => {
            it(`should warn on conflict with local @keyframes`, () => {
                expectAnalyzeDiagnostics(
                    `
                    |@st-import [keyframes(a)] from "./x.st.css"|;
                    @keyframes a{}
                    @media (max-width: 1px) {
                        @keyframes a{}
                    }`,
                    [
                        {
                            message: STSymbol.diagnostics.REDECLARE_SYMBOL('a'),
                            severity: `warning`,
                            file: '/entry.st.css',
                        },
                        {
                            message: STSymbol.diagnostics.REDECLARE_SYMBOL('a'),
                            severity: `warning`,
                            file: '/entry.st.css',
                            skipLocationCheck: true,
                        },
                        {
                            message: STSymbol.diagnostics.REDECLARE_SYMBOL('a'),
                            severity: `warning`,
                            file: '/entry.st.css',
                            skipLocationCheck: true,
                        },
                    ]
                );
            });
            it(`should error on unknown imported keyframes symbol`, () => {
                expectTransformDiagnostics(
                    {
                        entry: `/main.st.css`,
                        files: {
                            '/main.st.css': {
                                content: `
                                |@st-import [keyframes($unknown$ as local)] from "./import.st.css"|;
                            `,
                            },
                            '/import.st.css': {
                                content: ``,
                            },
                        },
                    },
                    [
                        {
                            message: CSSKeyframes.diagnostics.UNKNOWN_IMPORTED_KEYFRAMES(
                                `unknown`,
                                `./import.st.css`
                            ),
                            severity: `error`,
                            file: `/main.st.css`,
                        },
                    ]
                );
            });
        });
    });
});
