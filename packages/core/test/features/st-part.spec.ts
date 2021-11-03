import { STPart, CSSClass, CSSType } from '@stylable/core/dist/features';
import { ignoreDeprecationWarn } from '@stylable/core/dist/helpers/deprecation';
import { generateStylableResult, expectTransformDiagnostics } from '@stylable/core-test-kit';
import { expect } from 'chai';

describe(`features/st-part`, () => {
    describe(`meta`, () => {
        it(`should collect class part definitions`, () => {
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

            expect(STPart.getPart(meta, `a`), `a`).to.eql({
                node: meta.ast.nodes[0],
                symbol: CSSClass.getClass(meta, `a`),
            });
            expect(STPart.getPart(meta, `b`), `b`).to.eql({
                node: meta.ast.nodes[1],
                symbol: CSSClass.getClass(meta, `b`),
            });
            // deprecation
            expect(
                ignoreDeprecationWarn(() => meta.simpleSelectors),
                `deprecated 'meta.simpleSelectors'`
            ).to.eql({
                a: STPart.getPart(meta, `a`),
                b: STPart.getPart(meta, `b`),
            });
        });
        it(`should collect only type selector component part definitions (capital letter)`, () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: `entry`,
                        content: `
                            span {}
                            Comp {}
                        `,
                    },
                },
            });

            expect(STPart.getPart(meta, `Comp`), `component`).to.eql({
                node: meta.ast.nodes[1],
                symbol: CSSType.getType(meta, `Comp`),
            });
            expect(STPart.getPart(meta, `span`), `native`).to.equal(undefined);
            // deprecation
            expect(
                ignoreDeprecationWarn(() => meta.simpleSelectors),
                `deprecated 'meta.simpleSelectors'`
            ).to.eql({
                Comp: STPart.getPart(meta, `Comp`),
            });
        });
        it(`should NOT have root class symbol by default`, () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: `entry`,
                        content: ``,
                    },
                },
            });

            expect(STPart.getPart(meta, `root`)).to.equal(undefined);
        });
        it(`should collect defined root class`, () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: `entry`,
                        content: `.root {}`,
                    },
                },
            });

            expect(STPart.getPart(meta, `root`)).to.eql({
                node: meta.ast.nodes[0],
                symbol: CSSClass.getClass(meta, `root`),
            });
        });
    });
    describe(`diagnostics`, () => {
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
                            message: STPart.diagnostics.CANNOT_EXTEND_JS(),
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
                            message: STPart.diagnostics.CANNOT_EXTEND_UNKNOWN_SYMBOL(`special`),
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
                            message: STPart.diagnostics.IMPORT_ISNT_EXTENDABLE(),
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
                            message: STPart.diagnostics.UNKNOWN_IMPORT_ALIAS(`inner-class`),
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
