import { STImport, STSymbol } from '@stylable/core/dist/features';
import { ignoreDeprecationWarn } from '@stylable/core/dist/helpers/deprecation';
import {
    generateStylableResult,
    expectAnalyzeDiagnostics,
    expectTransformDiagnostics,
    testInlineExpects,
} from '@stylable/core-test-kit';
import chai, { expect } from 'chai';
import chaiSubset from 'chai-subset';
chai.use(chaiSubset);

describe(`features/st-import`, () => {
    describe(`meta`, () => {
        it(`should collect import statements`, () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: `entry`,
                        content: `
                        @st-import "./no/import";
                        @st-import a from "./default/import";
                        @st-import [b, c as x] from "./named/import";
                        @st-import d, [e] from "./default&named/import";
                        @st-import abs from "/absolute/path";
                        `,
                    },
                },
            });

            expect(STImport.getImportStatements(meta), `internal`).to.containSubset([
                {
                    request: `./no/import`,
                    defaultExport: ``,
                    named: {},
                },
                {
                    request: `./default/import`,
                    defaultExport: `a`,
                    named: {},
                },
                {
                    request: `./named/import`,
                    defaultExport: ``,
                    named: { b: `b`, x: `c` },
                },
                {
                    request: `./default&named/import`,
                    defaultExport: `d`,
                    named: { e: `e` },
                },
                {
                    request: `/absolute/path`,
                    defaultExport: `abs`,
                    named: {},
                },
            ]);
            expect(meta.getImportStatements(), `public`).to.eql(STImport.getImportStatements(meta));
            // deprecation
            expect(
                ignoreDeprecationWarn(() => meta.imports),
                `deprecated 'meta.imports'`
            ).to.eql(meta.getImportStatements());
        });
        it(`should add imported symbols`, () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: `entry`,
                        content: `
                        @st-import a, [b, c-origin as c-local] from "./some/external/path";
                        `,
                    },
                },
            });

            expect(meta.getSymbol(`a`), `default`).to.contain({
                _kind: `import`,
                type: 'default',
                name: `default`,
            });
            expect(meta.getSymbol(`b`), `named`).to.contain({
                _kind: `import`,
                type: 'named',
                name: `b`,
            });
            expect(meta.getSymbol(`c-local`), `mapped`).to.contain({
                _kind: `import`,
                type: 'named',
                name: `c-origin`,
            });
        });
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
    describe(`transform`, () => {
        it('should remove @st-import from output', () => {
            const { meta } = generateStylableResult({
                entry: `/main.st.css`,
                files: {
                    '/main.st.css': {
                        content: `
                            @st-import Name from "./other.st.css";
                            Name {}
                        `,
                    },
                    '/other.st.css': {
                        content: ``,
                    },
                },
            });

            expect(meta.outputAst!.nodes.length).to.equal(1);
            expect(meta.outputAst!.toString()).to.not.contain('@st-import');
        });
        it('should remove nested @st-import from output', () => {
            const { meta } = generateStylableResult({
                entry: `/main.st.css`,
                files: {
                    '/main.st.css': {
                        content: `
                            div {
                                @st-import Name from "./other.st.css";
                            }
                        `,
                    },
                    '/other.st.css': {
                        content: ``,
                    },
                },
            });

            expect(meta.outputAst!.toString()).to.not.contain('@st-import');
        });
        it('should hoist @st-import', () => {
            const { meta } = generateStylableResult({
                entry: `/main.st.css`,
                files: {
                    '/main.st.css': {
                        content: `
                            /* @check .other__root */
                            Name {}
                            @st-import Name from "./other.st.css";
                        `,
                    },
                    '/other.st.css': {
                        namespace: `other`,
                        content: ``,
                    },
                },
            });

            testInlineExpects(meta.outputAst!);
        });
    });
    describe(`diagnostics`, () => {
        it('should not allow nested import', () => {
            expectAnalyzeDiagnostics(
                `@at {
                    |@st-import "./some/path"|;
                }
                .cls {
                    @st-import "./other/path" 
                }`,
                [
                    {
                        file: `/entry.st.css`,
                        message: STImport.diagnostics.NO_ST_IMPORT_IN_NESTED_SCOPE(),
                        severity: `warning`,
                    },
                    {
                        file: `/entry.st.css`,
                        message: STImport.diagnostics.NO_ST_IMPORT_IN_NESTED_SCOPE(),
                        severity: `warning`,
                        skipLocationCheck: true,
                    },
                ],
                { partial: true }
            );
        });
        it('should warn on empty from', () => {
            expectAnalyzeDiagnostics(
                `
                @st-import X from "";
                @st-import Y from " ";
            `,
                [
                    {
                        file: `/entry.st.css`,
                        message: STImport.diagnostics.ST_IMPORT_EMPTY_FROM(),
                        severity: `error`,
                        skipLocationCheck: true,
                    },
                    {
                        file: `/entry.st.css`,
                        message: STImport.diagnostics.ST_IMPORT_EMPTY_FROM(),
                        severity: `error`,
                        skipLocationCheck: true,
                    },
                ],
                { partial: true }
            );
        });
        it('should warn on default lowercase import from css file', () => {
            expectAnalyzeDiagnostics(
                `
                |@st-import $sheetError$ from "./a.st.css"|;
                @st-import SheetStartWithCapital from "./b.st.css";
                @st-import otherModuleDontCare from "./c.js";
            `,
                [
                    {
                        message: STImport.diagnostics.DEFAULT_IMPORT_IS_LOWER_CASE(),
                        severity: `warning`,
                        file: 'main.css',
                    },
                ]
            );
        });
        it('should warn on invalid custom property rename', () => {
            expectAnalyzeDiagnostics(
                `
                |@st-import [--x as z] from "./a.st.css";|
            `,
                [
                    {
                        message: STImport.diagnostics.INVALID_CUSTOM_PROPERTY_AS_VALUE(`--x`, `z`),
                        severity: `warning`,
                        file: `main.st.css`,
                    },
                ]
            );
        });
        describe(`syntax`, () => {
            it('should not allow * import', () => {
                expectAnalyzeDiagnostics(`|@st-import * as X from "./some/path"|;`, [
                    {
                        file: `/entry.st.css`,
                        message: STImport.diagnostics.ST_IMPORT_STAR(),
                        severity: `error`,
                    },
                ]);
            });
            it('should warn on invalid format', () => {
                expectAnalyzeDiagnostics(
                    `
                    |@st-import %# from ("")|;
                    @st-import f rom "x";
                `,
                    [
                        {
                            file: `/entry.st.css`,
                            message: STImport.diagnostics.INVALID_ST_IMPORT_FORMAT([
                                `invalid missing source`,
                            ]),
                            severity: `error`,
                        },
                        {
                            file: `/entry.st.css`,
                            message: STImport.diagnostics.INVALID_ST_IMPORT_FORMAT([
                                `invalid missing from`,
                                `invalid missing source`,
                            ]),
                            severity: `error`,
                            skipLocationCheck: true,
                        },
                    ]
                );
            });
        });
        describe(`redeclare symbol`, () => {
            it(`should warn within a single import symbol`, () => {
                expectAnalyzeDiagnostics(
                    `
                    |@st-import Name, [$Name$] from "./file.st.css"|;
                `,
                    [
                        {
                            message: STSymbol.diagnostics.REDECLARE_SYMBOL(`Name`),
                            severity: `warning`,
                            file: `main.st.css`,
                        },
                    ]
                );
            });
            it(`should warn between multiple import statements`, () => {
                expectAnalyzeDiagnostics(
                    `
                    @st-import Name from "./file.st.css";
                    |@st-import $Name$ from "./file.st.css"|;
                `,
                    [
                        {
                            message: STSymbol.diagnostics.REDECLARE_SYMBOL(`Name`),
                            severity: `warning`,
                            file: `main.st.css`,
                        },
                    ]
                );
            });
        });
        describe(`unknown import`, () => {
            it(`should error on unresolved file`, () => {
                expectTransformDiagnostics(
                    {
                        entry: `/main.st.css`,
                        files: {
                            '/main.st.css': {
                                namespace: `entry`,
                                content: `
                                |@st-import "$./missing.st.css$";|
                            `,
                            },
                        },
                    },
                    [
                        {
                            message: STImport.diagnostics.UNKNOWN_IMPORTED_FILE('./missing.st.css'),
                            severity: `warning`,
                            file: '/main.st.css',
                        },
                    ]
                );
            });
            it(`should error on unresolved file from third party`, () => {
                expectTransformDiagnostics(
                    {
                        entry: `/main.st.css`,
                        files: {
                            '/main.st.css': {
                                namespace: `entry`,
                                content: `
                                    |@st-import "$missing-package/index.st.css$";|
                                `,
                            },
                        },
                    },
                    [
                        {
                            message: STImport.diagnostics.UNKNOWN_IMPORTED_FILE(
                                `missing-package/index.st.css`
                            ),
                            severity: `warning`,
                            file: `/main.st.css`,
                        },
                    ]
                );
            });
            it(`should warn on unknown imported symbol`, () => {
                // ToDo: should check without actual usage
                expectTransformDiagnostics(
                    {
                        entry: `/main.st.css`,
                        files: {
                            '/main.st.css': {
                                content: `
                                |@st-import [unknown] from "./import.st.css"|;
                                .myClass {
                                    -st-extends: unknown;
                                }
                            `,
                            },
                            '/import.st.css': {
                                content: ``,
                            },
                        },
                    },
                    [
                        {
                            message: STImport.diagnostics.UNKNOWN_IMPORTED_SYMBOL(
                                `unknown`,
                                `./import.st.css`
                            ),
                            severity: `warning`,
                            file: `/main.st.css`,
                        },
                    ],
                    { partial: true }
                );
            });
            it(`should warn on unknown imported symbol with alias`, () => {
                expectTransformDiagnostics(
                    {
                        entry: `/main.st.css`,
                        files: {
                            '/main.st.css': {
                                namespace: `entry`,
                                content: `
                                    |@st-import [$Missing$ as LocalMissing] from "./imported.st.css"|;
                                `,
                            },
                            '/imported.st.css': {
                                content: ``,
                            },
                        },
                    },
                    [
                        {
                            message: STImport.diagnostics.UNKNOWN_IMPORTED_SYMBOL(
                                'Missing',
                                './imported.st.css'
                            ),
                            severity: `warning`,
                            file: '/main.st.css',
                        },
                    ]
                );
            });
        });
    });
    describe(`:import (legacy pseudo-import syntax)`, () => {
        describe(`meta`, () => {
            it(`should collect import statements`, () => {
                const { meta } = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: `entry`,
                            content: `
                            :import {
                                -st-from: "./no/import";
                            }
                            :import {
                                -st-from: "./default/import";
                                -st-default: a;
                            }
                            :import {
                                -st-from: "./named/import";
                                -st-named: b, c as x;
                            }
                            :import {
                                -st-from: "./default&named/import";
                                -st-default: d;
                                -st-named: e;
                            }
                            :import {
                                -st-from: "./absolute/path";
                                -st-default: abs;
                            }
                            `,
                        },
                    },
                });

                expect(STImport.getImportStatements(meta), `internal`).to.containSubset([
                    {
                        request: `./no/import`,
                        defaultExport: ``,
                        named: {},
                    },
                    {
                        request: `./default/import`,
                        defaultExport: `a`,
                        named: {},
                    },
                    {
                        request: `./named/import`,
                        defaultExport: ``,
                        named: { b: `b`, x: `c` },
                    },
                    {
                        request: `./default&named/import`,
                        defaultExport: `d`,
                        named: { e: `e` },
                    },
                    {
                        request: `./absolute/path`,
                        defaultExport: `abs`,
                        named: {},
                    },
                ]);
                expect(meta.getImportStatements(), `public`).to.eql(
                    STImport.getImportStatements(meta)
                );
                // deprecation
                expect(
                    ignoreDeprecationWarn(() => meta.imports),
                    `deprecated 'meta.imports'`
                ).to.eql(meta.getImportStatements());
            });
            it(`should add imported symbols`, () => {
                const { meta } = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: `entry`,
                            content: `
                            :import {
                                -st-from: "./some/external/path";
                                -st-default: a;
                                -st-named: b, c-origin as c-local;
                            }`,
                        },
                    },
                });

                expect(meta.getSymbol(`a`), `default`).to.contain({
                    _kind: `import`,
                    type: 'default',
                    name: `default`,
                });
                expect(meta.getSymbol(`b`), `named`).to.contain({
                    _kind: `import`,
                    type: 'named',
                    name: `b`,
                });
                expect(meta.getSymbol(`c-local`), `mapped`).to.contain({
                    _kind: `import`,
                    type: 'named',
                    name: `c-origin`,
                });
            });
            it(`should add imported keyframes symbols`, () => {
                const { meta } = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: `entry`,
                            content: `
                            :import {
                                -st-from: "./path";
                                -st-named: keyframes(a, b-origin as b-local);
                            }`,
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
        describe(`transform`, () => {
            it('should remove :import from output', () => {
                const { meta } = generateStylableResult({
                    entry: `/main.st.css`,
                    files: {
                        '/main.st.css': {
                            content: `
                                :import{
                                    -st-from: "./other.st.css";
                                    -st-default: Name;
                                }
                                Name {}
                            `,
                        },
                        '/other.st.css': {
                            content: ``,
                        },
                    },
                });

                expect(meta.outputAst?.nodes.length).to.equal(1);
            });
            it('should remove nested :import from output', () => {
                const { meta } = generateStylableResult({
                    entry: `/main.st.css`,
                    files: {
                        '/main.st.css': {
                            content: `
                                div {
                                    :import{
                                        -st-from: "./other.st.css";
                                        -st-default: Name;
                                    }
                                }
                            `,
                        },
                        '/other.st.css': {
                            content: ``,
                        },
                    },
                });

                expect(meta.outputAst!.toString()).to.not.contain(':import');
            });
            it('should hoist :import', () => {
                const { meta } = generateStylableResult({
                    entry: `/main.st.css`,
                    files: {
                        '/main.st.css': {
                            content: `
                                /* @check .other__root */
                                Name {}
                                :import {
                                    -st-from: "./other.st.css";
                                    -st-default: Name 
                                }
                            `,
                        },
                        '/other.st.css': {
                            namespace: `other`,
                            content: ``,
                        },
                    },
                });

                testInlineExpects(meta.outputAst!);
            });
        });
        describe(`diagnostics`, () => {
            it('should not allow nested import', () => {
                expectAnalyzeDiagnostics(
                    `@at {
                        |:import {
                            -st-from: "./some/path"
                        }|
                    }
                    .cls {
                        :import {
                            -st-from: "./other/path"
                        }
                    }`,
                    [
                        {
                            file: `/entry.st.css`,
                            message: STImport.diagnostics.NO_PSEUDO_IMPORT_IN_NESTED_SCOPE(),
                            severity: `warning`,
                        },
                        {
                            file: `/entry.st.css`,
                            message: STImport.diagnostics.NO_PSEUDO_IMPORT_IN_NESTED_SCOPE(),
                            severity: `warning`,
                            skipLocationCheck: true,
                        },
                    ],
                    { partial: true }
                );
            });
            it('should error on empty "-st-from" declaration', () => {
                expectAnalyzeDiagnostics(
                    `
                    :import{
                        |-st-from: "   ";|
                        -st-default: Comp;
                    }
                `,
                    [
                        {
                            severity: 'error',
                            message: STImport.diagnostics.EMPTY_IMPORT_FROM(),
                            file: 'main.st.css',
                        },
                    ]
                );
            });
            it('should warn on default lowercase import from css file', () => {
                expectAnalyzeDiagnostics(
                    `
                    :import{
                        -st-from:"./a.st.css";
                        |-st-default: $sheetError$;|
                    }
                    :import{
                        -st-from:"./b.st.css";
                        -st-default: SheetStartWithCapital;
                    }
                    :import{
                        -st-from:"./c.js";
                        -st-default: otherModuleDontCare;
                    }
                `,
                    [
                        {
                            message: STImport.diagnostics.DEFAULT_IMPORT_IS_LOWER_CASE(),
                            file: 'main.css',
                            severity: `warning`,
                        },
                    ]
                );
            });
            it(`should not allow in complex selector`, () => {
                expectAnalyzeDiagnostics(
                    `
                    |.gaga:import|{
                        -st-from:"./file.st.css";
                        -st-default:Comp;
                    }
                `,
                    [
                        {
                            message:
                                STImport.diagnostics.FORBIDDEN_DEF_IN_COMPLEX_SELECTOR(`:import`),
                            file: `main.css`,
                            severity: `warning`,
                        },
                    ]
                );
            });
            it('should warn on invalid custom property rename', () => {
                expectAnalyzeDiagnostics(
                    `
                    |:import {
                        -st-from: "./a.st.css";
                        -st-named: --x as z;
                    }|
                `,
                    [
                        {
                            message: STImport.diagnostics.INVALID_CUSTOM_PROPERTY_AS_VALUE(
                                `--x`,
                                `z`
                            ),
                            severity: `warning`,
                            file: `main.st.css`,
                        },
                    ]
                );
            });
            describe(`syntax`, () => {
                it('should error on missing "-st-from" declaration', () => {
                    expectAnalyzeDiagnostics(
                        `
                        |:import{
                            -st-default:Comp;
                        }|
                    `,
                        [
                            {
                                message: STImport.diagnostics.FROM_PROP_MISSING_IN_IMPORT(),
                                file: `main.st.css`,
                                severity: `error`,
                            },
                        ]
                    );
                });
                it('should warn on multiple "-st-from" declarations', () => {
                    expectAnalyzeDiagnostics(
                        `
                        |:import{
                            -st-from: "a";
                            -st-from: "b";
                            -st-default: Comp;
                        }|
                    `,
                        [
                            {
                                message: STImport.diagnostics.MULTIPLE_FROM_IN_IMPORT(),
                                file: 'main.st.css',
                            },
                        ]
                    );
                });
                it('should warn on unknown nested declarations', () => {
                    expectAnalyzeDiagnostics(
                        `
                        :import{
                            -st-from:"./imported.st.css";
                            -st-default:Comp;
                            |$color$:red;|
                        }
                        `,
                        [
                            {
                                message: STImport.diagnostics.ILLEGAL_PROP_IN_IMPORT(`color`),
                                file: `/main.st.css`,
                                severity: `warning`,
                            },
                        ]
                    );
                });
            });
            describe(`redeclare symbol`, () => {
                it(`should warn on redeclare import symbol`, () => {
                    expectAnalyzeDiagnostics(
                        `
                        |:import {
                            -st-from: './file.st.css';
                            -st-default: Name;
                            -st-named: $Name$;
                        }
                    `,
                        [
                            {
                                message: STSymbol.diagnostics.REDECLARE_SYMBOL(`Name`),
                                severity: `warning`,
                                file: `main.st.css`,
                            },
                        ]
                    );
                });
                it(`should warn on redeclare import between multiple import statements`, () => {
                    expectAnalyzeDiagnostics(
                        `
                        :import {
                            -st-from: './file.st.css';
                            -st-default: Name;
                        }
                        |:import {
                            -st-from: './file.st.css';
                            -st-default: $Name$;
                        }
                    `,
                        [
                            {
                                message: STSymbol.diagnostics.REDECLARE_SYMBOL(`Name`),
                                severity: `warning`,
                                file: 'main.st.css',
                            },
                        ]
                    );
                });
            });
            describe(`unknown import`, () => {
                it(`should error on unresolved file`, () => {
                    expectTransformDiagnostics(
                        {
                            entry: `/main.st.css`,
                            files: {
                                '/main.st.css': {
                                    namespace: `entry`,
                                    content: `
                                    :import{
                                        |-st-from: "$./missing.st.css$";|
                                    }
                                `,
                                },
                            },
                        },
                        [
                            {
                                message:
                                    STImport.diagnostics.UNKNOWN_IMPORTED_FILE('./missing.st.css'),
                                severity: `warning`,
                                file: '/main.st.css',
                            },
                        ]
                    );
                });
                it(`should error on unresolved file from third party`, () => {
                    expectTransformDiagnostics(
                        {
                            entry: `/main.st.css`,
                            files: {
                                '/main.st.css': {
                                    namespace: `entry`,
                                    content: `
                                        :import{
                                            |-st-from: "$missing-package/index.st.css$";|
                                        }
                                    `,
                                },
                            },
                        },
                        [
                            {
                                message: STImport.diagnostics.UNKNOWN_IMPORTED_FILE(
                                    `missing-package/index.st.css`
                                ),
                                file: `/main.st.css`,
                            },
                        ]
                    );
                });
                it(`should warn on unknown imported symbol`, () => {
                    expectTransformDiagnostics(
                        {
                            entry: `/main.st.css`,
                            files: {
                                '/main.st.css': {
                                    namespace: `entry`,
                                    content: `
                                        :import{
                                            -st-from: "./imported.st.css";
                                            |-st-named: $Missing$;|
                                        }
                                    `,
                                },
                                '/imported.st.css': {
                                    content: ``,
                                },
                            },
                        },
                        [
                            {
                                message: STImport.diagnostics.UNKNOWN_IMPORTED_SYMBOL(
                                    `Missing`,
                                    `./imported.st.css`
                                ),
                                severity: `warning`,
                                file: `/main.st.css`,
                            },
                        ]
                    );
                });
                it(`should error on unresolved named symbol with alias`, () => {
                    expectTransformDiagnostics(
                        {
                            entry: `/main.st.css`,
                            files: {
                                '/main.st.css': {
                                    namespace: `entry`,
                                    content: `
                                        :import{
                                            -st-from: "./imported.st.css";
                                            |-st-named: $Missing$ as LocalMissing;|
                                        }
                                    `,
                                },
                                '/imported.st.css': {
                                    content: ``,
                                },
                            },
                        },
                        [
                            {
                                message: STImport.diagnostics.UNKNOWN_IMPORTED_SYMBOL(
                                    `Missing`,
                                    `./imported.st.css`
                                ),
                                file: `/main.st.css`,
                            },
                        ]
                    );
                });
            });
        });
    });
});
