import { STImport, CSSClass, STSymbol } from '@stylable/core/dist/features';
import { ignoreDeprecationWarn } from '@stylable/core/dist/helpers/deprecation';
import {
    generateStylableResult,
    expectAnalyzeDiagnostics,
    testInlineExpects,
    generateStylableRoot,
    expectTransformDiagnostics,
} from '@stylable/core-test-kit';
import { expect } from 'chai';

describe(`features/css-class`, () => {
    describe(`meta`, () => {
        it(`should collect classes`, () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: `entry`,
                        content: `
                            .a {}
                            .b {}
                        `,
                    },
                },
            });

            expect(CSSClass.get(meta, `a`), `a`).to.contain({
                _kind: `class`,
                name: 'a',
            });
            expect(CSSClass.get(meta, `b`), `b`).to.contain({
                _kind: `class`,
                name: 'b',
            });
            expect(meta.getClass(`a`), `meta.getClass`).to.equal(CSSClass.get(meta, `a`));
            // deprecation
            expect(
                ignoreDeprecationWarn(() => meta.classes),
                `deprecated 'meta.classes'`
            ).to.eql({
                root: CSSClass.get(meta, `root`),
                a: CSSClass.get(meta, `a`),
                b: CSSClass.get(meta, `b`),
            });
        });
        it(`should have root class symbol by default`, () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: `entry`,
                        content: ``,
                    },
                },
            });

            expect(CSSClass.get(meta, `root`)).to.contain({
                _kind: `class`,
                name: 'root',
            });
        });
        it(`should add to general symbols`, () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: `entry`,
                        content: `
                            .a {}
                        `,
                    },
                },
            });

            expect(CSSClass.get(meta, `a`), `a`).to.equal(STSymbol.get(meta, `a`));
            expect(CSSClass.get(meta, `root`), `root`).to.equal(STSymbol.get(meta, `root`));
        });
        it(`should mark class as import alias`, () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: `entry`,
                        content: `
                            @st-import [imported] from './other.st.css';
                            .root .imported {}
                        `,
                    },
                    '/other.st.css': {
                        namespace: `other`,
                        content: `.imported {}`,
                    },
                },
            });

            // ToDo: replace with STImport.getImport() once import feature is ready
            const importDef = meta.getImportStatements()[0];
            expect(CSSClass.get(meta, `imported`), `symbol`).to.eql({
                _kind: `class`,
                name: 'imported',
                alias: STImport.createImportSymbol(importDef, `named`, `imported`, `/`),
            });
            expect(meta.diagnostics.reports, `diagnostics`).to.eql([]);
        });
        it(`should return collected symbols`, () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: `entry`,
                        content: `
                            .btn {}
                            .gallery {}
                        `,
                    },
                },
            });

            expect(CSSClass.getAll(meta)).to.eql({
                root: CSSClass.get(meta, `root`),
                btn: CSSClass.get(meta, `btn`),
                gallery: CSSClass.get(meta, `gallery`),
            });
            expect(meta.getAllClasses(), `meta.getAllClasses`).to.eql(CSSClass.getAll(meta));
        });
    });
    describe(`transform`, () => {
        it('should namespace local classes', () => {
            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            /* @check .entry__a */
                            .a {}
                            /* @check .entry__b, .entry__c */
                            .b, .c {}
                            /* @check .entry__d .entry__e*/
                            .d .e {}
                        `,
                    },
                },
            });

            testInlineExpects(result);
        });
        it('scope local root class', () => {
            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            /* @check .entry__root */
                            .root {}
                            /* @check .entry__root .entry__a */
                            .root .a {}
                            /* @check .entry__root .entry__b, .entry__c */
                            .root .b, .c{}
                        `,
                    },
                },
            });

            testInlineExpects(result);
        });
        describe(`-st-global`, () => {
            it('should replace class symbol', () => {
                const result = generateStylableRoot({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                /* @check .x */
                                .root {
                                    -st-global: ".x";
                                }
                                /* @check .y*/
                                .a {
                                    -st-global: ".y";
                                }
                            `,
                        },
                    },
                });

                testInlineExpects(result);
            });
            it('should replace with complex selector', () => {
                const result = generateStylableRoot({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                /* @check .x.y */
                                .root {
                                    -st-global: ".x.y";
                                }
                                /* @check .z.zz */
                                .a {
                                    -st-global: ".z.zz";
                                }
                            `,
                        },
                    },
                });

                testInlineExpects(result);
            });
            it(`should replace imported class`, () => {
                const result = generateStylableRoot({
                    entry: `/style.st.css`,
                    files: {
                        '/style.st.css': {
                            namespace: 'ns',
                            content: `
                                @st-import [root as iRoot, part as iPart] from "./inner.st.css";

                                /* @check .r */
                                .iRoot {}

                                /* @check .p */
                                .iPart {}
                            `,
                        },
                        '/inner.st.css': {
                            namespace: 'ns1',
                            content: `
                                .root {
                                    -st-global: ".r";
                                }
                                .part {
                                    -st-global: ".p"
                                }
                            `,
                        },
                    },
                });

                testInlineExpects(result);
            });
        });
        describe(`escape`, () => {
            it('should namespace and preserve local class', () => {
                const result = generateStylableRoot({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry.1',
                            content: `
                                /* @check .entry\\.1__a\\. */
                                .a\\. {}
                            `,
                        },
                    },
                });

                testInlineExpects(result);
            });
        });
    });
    describe(`diagnostics`, () => {
        it(`should error on unsupported functional class`, () => {
            expectAnalyzeDiagnostics(
                `|$.abc()$| {}`,
                [
                    {
                        file: `/entry.st.css`,
                        message: CSSClass.diagnostics.INVALID_FUNCTIONAL_SELECTOR(`.abc`, `class`),
                        severity: `error`,
                    },
                ],
                { partial: true }
            );
        });
        describe(`scoping`, () => {
            it(`should warn on unscoped class`, () => {
                expectAnalyzeDiagnostics(
                    `
                    @st-import [importedPart] from "./imported.st.css";
                    |.$importedPart$|{}
                    `,
                    [
                        {
                            file: `/entry.st.css`,
                            message: CSSClass.diagnostics.UNSCOPED_CLASS(`importedPart`),
                            severity: `warning`,
                        },
                    ]
                );
            });
            it(`should not warn if the selector is scoped before imported class`, () => {
                expectAnalyzeDiagnostics(
                    `
                    @st-import [importedPart] from "./imported.st.css";
                    .local .importedPart {}
                    `,
                    []
                );
            });
            it(`should not warn if a later part of the compound selector is scoped`, () => {
                /*
                ToDo: consider to accept as scoped when local symbol exists
                anywhere in the selector: ".importedPart .local div"
                */
                expectAnalyzeDiagnostics(
                    `
                    @st-import [importedPart] from "./imported.st.css";
                    .importedPart.local {}
                    .local.importedPart {}
                    `,
                    []
                );
            });
        });
        describe(`-st-extends`, () => {
            it(`should error on extended JS`, () => {
                expectTransformDiagnostics(
                    {
                        entry: `/main.css`,
                        files: {
                            '/main.css': {
                                content: `
                                    :import {
                                        -st-from: './imported.js';
                                        -st-default: special;
                                    }
                                    .myclass {
                                        |-st-extends: $special$|
                                    }
                            `,
                            },
                            '/imported.js': {
                                content: ``,
                            },
                        },
                    },
                    [
                        {
                            file: `/main.css`,
                            message: CSSClass.diagnostics.CANNOT_EXTEND_JS(),
                            severity: `error`,
                        },
                    ]
                );
            });
            it(`should error on extended unknown named import`, () => {
                expectTransformDiagnostics(
                    {
                        entry: `/main.css`,
                        files: {
                            '/main.css': {
                                content: `
                                    :import {
                                        -st-from: './file.st.css';
                                        -st-named: special;
                                    }
                                    .myclass {
                                        |-st-extends: $special$;|
                                    }
                            `,
                            },
                            '/file.st.css': {
                                content: ``,
                            },
                        },
                    },
                    [
                        {
                            file: `/main.css`,
                            message: CSSClass.diagnostics.CANNOT_EXTEND_UNKNOWN_SYMBOL(`special`),
                            severity: `error`,
                        },
                    ],
                    { partial: true }
                );
            });
            it(`should error on extended symbols that are not a class`, () => {
                expectTransformDiagnostics(
                    {
                        entry: `/main.st.css`,
                        files: {
                            '/main.st.css': {
                                content: `
                                    :import {
                                        -st-from: './file.st.css';
                                        -st-named: special;
                                    }
                                    .myclass {
                                        |-st-extends: $special$|;
                                    }
                            `,
                            },
                            '/file.st.css': {
                                content: `
                                    :vars {
                                        special: red;
                                    }
                            `,
                            },
                        },
                    },
                    [
                        {
                            file: `/main.st.css`,
                            message: CSSClass.diagnostics.IMPORT_ISNT_EXTENDABLE(),
                            severity: `error`,
                        },
                    ]
                );
            });
            it(`should error on extended unresolved alias`, () => {
                expectTransformDiagnostics(
                    {
                        entry: `/main.st.css`,
                        files: {
                            '/main.st.css': {
                                namespace: `entry`,
                                content: `
                                    @st-import Imported [inner-class] from "./imported.st.css";
        
                                    .root .Imported{}
                                    |.root .$inner-class$ {}|
                            `,
                            },
                            '/imported.st.css': {
                                namespace: `imported`,
                                content: ``,
                            },
                        },
                    },
                    [
                        {
                            message: CSSClass.diagnostics.UNKNOWN_IMPORT_ALIAS(`inner-class`),
                            file: `/main.st.css`,
                            severity: `error`,
                        },
                    ],
                    { partial: true }
                );
            });
        });
    });
});
