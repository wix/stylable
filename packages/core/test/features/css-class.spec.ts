import { CSSClass, STSymbol } from '@stylable/core/dist/features';
import { ignoreDeprecationWarn } from '@stylable/core/dist/helpers/deprecation';
import {
    generateStylableResult,
    expectWarningsFromTransform as expectWarnings,
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

            expect(CSSClass.getClass(meta, `a`), `a`).to.contain({
                _kind: `class`,
                name: 'a',
            });
            expect(CSSClass.getClass(meta, `b`), `b`).to.contain({
                _kind: `class`,
                name: 'b',
            });
            // deprecation
            expect(
                ignoreDeprecationWarn(() => meta.classes),
                `deprecated 'meta.classes'`
            ).to.eql({
                root: CSSClass.getClass(meta, `root`),
                a: CSSClass.getClass(meta, `a`),
                b: CSSClass.getClass(meta, `b`),
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

            expect(CSSClass.getClass(meta, `root`)).to.contain({
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

            expect(CSSClass.getClass(meta, `a`), `a`).to.equal(STSymbol.getSymbol(meta, `a`));
            expect(CSSClass.getClass(meta, `root`), `root`).to.equal(
                STSymbol.getSymbol(meta, `root`)
            );
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
            expect(CSSClass.getClass(meta, `imported`), `symbol`).to.eql({
                _kind: `class`,
                name: 'imported',
                alias: {
                    _kind: 'import',
                    type: 'named',
                    name: 'imported',
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
                            .btn {}
                            .gallery {}
                        `,
                    },
                },
            });

            expect(CSSClass.getSymbols(meta)).to.eql({
                root: CSSClass.getClass(meta, `root`),
                btn: CSSClass.getClass(meta, `btn`),
                gallery: CSSClass.getClass(meta, `gallery`),
            });
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
                            content: `|.root $.abc()$| {}`,
                        },
                    },
                },
                [
                    {
                        severity: `error`,
                        message: CSSClass.diagnostics.INVALID_FUNCTIONAL_SELECTOR(`.abc`, `class`),
                        file: `/entry.st.css`,
                    },
                ]
            );
        });
        describe(`scoping`, () => {
            it(`should warn on unscoped class`, () => {
                expectWarnings(
                    {
                        entry: `/entry.st.css`,
                        files: {
                            '/entry.st.css': {
                                namespace: 'entry',
                                content: `
                                    @st-import [importedPart] from "./imported.st.css";
                                    |.$importedPart$|{}
                                `,
                            },
                            '/imported.st.css': {
                                namespace: 'imported',
                                content: `.importedPart {}`,
                            },
                        },
                    },
                    [
                        {
                            severity: `warning`,
                            message: CSSClass.diagnostics.UNSCOPED_CLASS(`importedPart`),
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
                                    @st-import [importedPart] from "./imported.st.css";
                                    .local .importedPart {}
                                `,
                            },
                            '/imported.st.css': {
                                namespace: 'imported',
                                content: `.importedPart {}`,
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
                                    @st-import [importedPart] from "./imported.st.css";
                                    .importedPart.local {}
                                    .local.importedPart {}
                                    /*
                                    ToDo: consider to accept as scoped when local symbol exists
                                    anywhere in the selector: ".importedPart .local div"
                                    */
                                `,
                            },
                            '/imported.st.css': {
                                namespace: 'imported',
                                content: `.importedPart {}`,
                            },
                        },
                    },
                    []
                );
            });
        });
    });
});
