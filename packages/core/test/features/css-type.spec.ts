import { STImport, CSSType, STSymbol } from '@stylable/core/dist/features';
import { ignoreDeprecationWarn } from '@stylable/core/dist/helpers/deprecation';
import {
    generateStylableResult,
    expectAnalyzeDiagnostics,
    generateStylableRoot,
    testInlineExpects,
} from '@stylable/core-test-kit';
import { expect } from 'chai';

describe(`features/css-type`, () => {
    describe(`meta`, () => {
        it(`should collect component types definition (capital letter)`, () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: `entry`,
                        content: `
                            Btn {}
                            div {}
                        `,
                    },
                },
            });

            expect(CSSType.get(meta, `Btn`), `Btn`).to.contain({
                _kind: `element`,
                name: 'Btn',
            });
            expect(CSSType.get(meta, `div`), `div`).to.eql(undefined);
            expect(meta.getTypeElement(`a`), `meta.getTypeElement`).to.equal(
                CSSType.get(meta, `a`)
            );
            // deprecation
            expect(
                ignoreDeprecationWarn(() => meta.elements),
                `deprecated 'meta.elements'`
            ).to.eql({ Btn: CSSType.get(meta, `Btn`) });
        });
        it(`should add to general symbols`, () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: `entry`,
                        content: `
                            Comp {}
                        `,
                    },
                },
            });

            expect(CSSType.get(meta, `Comp`)).to.equal(STSymbol.get(meta, `Comp`));
        });
        it(`should mark type as import alias`, () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: `entry`,
                        content: `
                            @st-import Imported from './other.st.css';
                            .root Imported {}
                        `,
                    },
                    '/other.st.css': {
                        namespace: `other`,
                        content: ``,
                    },
                },
            });

            const importDef = meta.getImportStatements()[0];
            expect(CSSType.get(meta, `Imported`), `symbol`).to.eql({
                _kind: `element`,
                name: 'Imported',
                alias: STImport.createImportSymbol(importDef, `default`, `default`, `/`),
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
                            Btn {}
                            Gallery {}
                        `,
                    },
                },
            });

            expect(CSSType.getAll(meta)).to.eql({
                Btn: CSSType.get(meta, `Btn`),
                Gallery: CSSType.get(meta, `Gallery`),
            });
            expect(meta.getAllTypeElements(), `meta.getAllTypeElements`).to.eql(
                CSSType.getAll(meta)
            );
        });
    });
    describe(`transform`, () => {
        it(`should transform imported root or part element`, () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: `
                            @st-import Imported, [part as Part] from "./imported.st.css";

                            /* @check .imported__root */
                            Imported {}
                            /* @check .imported__part */
                            Part {}
                        `,
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                            .root {}
                            .part {}
                        `,
                    },
                },
            });

            testInlineExpects(result);
        });
        describe(`-st-global`, () => {
            it(`should replace imported type`, () => {
                const result = generateStylableRoot({
                    entry: `/style.st.css`,
                    files: {
                        '/style.st.css': {
                            namespace: 'ns',
                            content: `
                                @st-import Container from "./inner.st.css";
                                
                                /* @check .x */
                                Container {}
                            `,
                        },
                        '/inner.st.css': {
                            namespace: 'ns1',
                            content: `
                                .root {
                                    -st-global: ".x";
                                }
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
                `|$div()$| {}`,
                [
                    {
                        file: `/entry.st.css`,
                        message: CSSType.diagnostics.INVALID_FUNCTIONAL_SELECTOR(`div`, `type`),
                        severity: `error`,
                    },
                ],
                { partial: true }
            );
        });
        describe(`scoping`, () => {
            it(`should warn on unscoped native type`, () => {
                expectAnalyzeDiagnostics(`|$button$| {}`, [
                    {
                        file: `/entry.st.css`,
                        message: CSSType.diagnostics.UNSCOPED_TYPE_SELECTOR(`button`),
                        severity: `warning`,
                    },
                ]);
            });
            it(`should warn on unscoped imported default type`, () => {
                expectAnalyzeDiagnostics(
                    `
                    @st-import Imported from "./imported.st.css";
                    |$Imported$|{}
                    `,
                    [
                        {
                            file: `/entry.st.css`,
                            message: CSSType.diagnostics.UNSCOPED_TYPE_SELECTOR(`Imported`),
                            severity: `warning`,
                        },
                    ]
                );
            });
            it(`should not warn if the selector is scoped before imported class`, () => {
                expectAnalyzeDiagnostics(`.local div {}`, []);
            });
            it(`should not warn if a later part of the compound selector is scoped`, () => {
                expectAnalyzeDiagnostics(`div.local {}`, []);
            });
        });
    });
});
