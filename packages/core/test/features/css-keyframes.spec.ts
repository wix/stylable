import { CSSKeyframes } from '@stylable/core/dist/features';
import {
    generateStylableRoot,
    generateStylableResult,
    generateStylableExports,
    processSource,
    testInlineExpects,
    expectTransformDiagnostics,
} from '@stylable/core-test-kit';
import { expect } from 'chai';

describe(`features/css-keyframes`, () => {
    describe(`meta`, () => {
        it('should collect @keyframes statements', () => {
            const result = processSource(
                `
                @keyframes name {
                    from{}
                    to{}
                }
                @keyframes anther-name {
                    from{}
                    to{}
                }
            `,
                { from: 'path/to/style.css' }
            );

            expect(result.keyframes.length).to.eql(2);
        });
        describe(`global`, () => {
            it('should collect global keyframes symbols', () => {
                const result = processSource(
                    `
                    @keyframes st-global(name) {
                        from{}
                        to{}
                    }
                `,
                    { from: 'path/to/style.css' }
                );

                expect(result.mappedKeyframes).to.eql({
                    name: {
                        _kind: 'keyframes',
                        alias: 'name',
                        name: 'name',
                        global: true,
                    },
                });
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

                expect(meta.mappedKeyframes.a, `named`).to.include({
                    _kind: 'keyframes',
                    name: 'a',
                });
                expect(meta.mappedKeyframes[`b-local`], `mapped`).to.include({
                    _kind: 'keyframes',
                    name: 'b-origin',
                    alias: 'b-local',
                    import: meta.getImportStatements()[0],
                });
            });
        });
    });
    describe(`transform`, () => {
        it('should namespace animation and animation name', () => {
            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            /* @check entry__name */
                            @keyframes name {
                                from {}
                                to {}
                            }
                            
                            /* @check entry__name2 */
                            @keyframes name2 {
                                from {}
                                to {}
                            }

                            /* @check .entry__selector {
                                animation: 2s entry__name infinite, 1s entry__name2 infinite;
                                animation-name: entry__name;
                            }*/
                            .selector {
                                animation: 2s name infinite, 1s name2 infinite;
                                animation-name: name;
                            }

                        `,
                    },
                },
            });

            testInlineExpects(result);
        });
        it('should not namespace nested rules of keyframes', () => {
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
                            @keyframes name2 {
                                /* @check 0% */
                                0% {}
                                /* @check 100% */
                                100% {}
                            }
                        `,
                    },
                },
            });

            testInlineExpects(result);
        });
        it('should not allow @keyframe of reserved words', () => {
            CSSKeyframes.reservedKeyFrames.map((key) => {
                const config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: `
                            |@keyframes $${key}$| {
                                from {}
                                to {}
                            }`,
                        },
                    },
                };
                expectTransformDiagnostics(config, [
                    {
                        message: CSSKeyframes.diagnostics.KEYFRAME_NAME_RESERVED(key),
                        file: '/main.css',
                    },
                ]);
            });
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
            it('should import global keyframes', () => {
                const config = {
                    entry: `/style.st.css`,
                    files: {
                        '/style.st.css': {
                            namespace: 'style',
                            content: `
                            @st-import [keyframes(globalName)] from "./a.st.css";
    
                            /* @check .style__foo {animation-name: globalName;} */
                            .foo {
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
            it('should import global keyframe (alias)', () => {
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
            describe(`JS exports`, () => {
                it('should contain local keyframe', () => {
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
                it('should contain imported keyframe', () => {
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
                                    @keyframes name {
        
                                    }
                                `,
                            },
                        },
                    });

                    expect(cssExports.keyframes).to.eql({
                        name: 'imported__name',
                    });
                });
                it('should contain imported keyframe as alias', () => {
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
                                    @keyframes name {
        
                                    }
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
                                    @keyframes name {
        
                                    }
                                `,
                            },
                            '/imported.st.css': {
                                namespace: 'imported',
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
    });
    describe(`diagnostics`, () => {
        it('should warn on missing keyframes parameter', () => {
            const { diagnostics } = processSource(`@keyframes {}`, { from: '/path/to/source' });

            expect(diagnostics.reports[0]).to.include({
                type: 'warning',
                message: CSSKeyframes.diagnostics.MISSING_KEYFRAMES_NAME(),
            });
        });
        describe(`global`, () => {
            it('should warn on missing keyframes parameter inside st-global', () => {
                const { diagnostics } = processSource(`@keyframes st-global() {}`, {
                    from: '/path/to/source',
                });

                expect(diagnostics.reports[0]).to.include({
                    type: 'warning',
                    message: CSSKeyframes.diagnostics.MISSING_KEYFRAMES_NAME_INSIDE_GLOBAL(),
                });
            });
        });
    });
});
