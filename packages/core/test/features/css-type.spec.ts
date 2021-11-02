import { CSSType, STSymbol } from '@stylable/core/dist/features';
import {
    generateStylableResult,
    expectWarningsFromTransform as expectWarnings,
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
    });
    describe(`diagnostics`, () => {
        it(`should error on unsupported functional class`, () => {
            expectWarnings(
                {
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `|.root $div()$| {}`,
                        },
                    },
                },
                [
                    {
                        severity: `error`,
                        message: CSSType.diagnostics.INVALID_FUNCTIONAL_SELECTOR(`div`, `type`),
                        file: `/entry.st.css`,
                    },
                ]
            );
        });
        describe(`scoping`, () => {
            it(`should warn on unscoped native type`, () => {
                expectWarnings(
                    {
                        entry: `/entry.st.css`,
                        files: {
                            '/entry.st.css': {
                                namespace: 'entry',
                                content: `
                                    |$button$|{}
                                `,
                            },
                        },
                    },
                    [
                        {
                            severity: `warning`,
                            message: CSSType.diagnostics.UNSCOPED_TYPE_SELECTOR(`button`),
                            file: `/entry.st.css`,
                        },
                    ]
                );
            });
            it(`should warn on unscoped imported default type`, () => {
                expectWarnings(
                    {
                        entry: `/entry.st.css`,
                        files: {
                            '/entry.st.css': {
                                namespace: 'entry',
                                content: `
                                    @st-import Imported from "./imported.st.css";
                                    |$Imported$|{}
                                `,
                            },
                            '/imported.st.css': {
                                namespace: 'imported',
                                content: ``,
                            },
                        },
                    },
                    [
                        {
                            severity: `warning`,
                            message: CSSType.diagnostics.UNSCOPED_TYPE_SELECTOR(`Imported`),
                            file: `/entry.st.css`,
                        },
                    ]
                );
            });
            it(`should not warn if the selector is scoped before imported class`, () => {
                expectWarnings(
                    {
                        entry: `/entry.st.css`,
                        files: {
                            '/entry.st.css': {
                                namespace: 'entry',
                                content: `
                                    .local div {}
                                `,
                            },
                        },
                    },
                    []
                );
            });
            it(`should not warn if a later part of the compound selector is scoped`, () => {
                expectWarnings(
                    {
                        entry: `/entry.st.css`,
                        files: {
                            '/entry.st.css': {
                                namespace: 'entry',
                                content: `
                                    div.local {}
                                `,
                            },
                        },
                    },
                    []
                );
            });
        });
    });
});
