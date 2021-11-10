import { CSSType, STSymbol } from '@stylable/core/dist/features';
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

            expect(CSSType.getType(meta, `Btn`), `Btn`).to.contain({
                _kind: `element`,
                name: 'Btn',
            });
            expect(CSSType.getType(meta, `span`), `div`).to.eql(undefined);
            // deprecation
            expect(
                ignoreDeprecationWarn(() => meta.elements),
                `deprecated 'meta.elements'`
            ).to.eql({ Btn: CSSType.getType(meta, `Btn`) });
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

            expect(CSSType.getType(meta, `Comp`)).to.equal(STSymbol.getSymbol(meta, `Comp`));
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

            // ToDo: replace with STImport.getImport() once import feature is ready
            expect(CSSType.getType(meta, `Imported`), `symbol`).to.eql({
                _kind: `element`,
                name: 'Imported',
                alias: {
                    _kind: 'import',
                    type: 'default',
                    name: 'default',
                    import: meta.imports[0],
                    context: `/`,
                },
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

            expect(CSSType.getSymbols(meta)).to.eql({
                Btn: CSSType.getType(meta, `Btn`),
                Gallery: CSSType.getType(meta, `Gallery`),
            });
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
