import { STImport, CSSType, STSymbol } from '@stylable/core/dist/features';
import { ignoreDeprecationWarn } from '@stylable/core/dist/helpers/deprecation';
import { testStylableCore, shouldReportNoDiagnostics } from '@stylable/core-test-kit';
import { expect } from 'chai';

describe(`features/css-type`, () => {
    it(`should process element types`, () => {
        const { sheets } = testStylableCore(`
            /* @rule(native) div */
            div {}

            /* @rule(custom) Btn */
            Btn {}

            /* @rule(complex selector) .entry__root Gallery, Btn, div */
            .root Gallery, Btn, div {}
        `);

        const { meta } = sheets['/entry.st.css'];

        // symbols
        expect(CSSType.get(meta, `Btn`), `collect capital letters`).to.contain({
            _kind: `element`,
            name: 'Btn',
        });
        expect(CSSType.get(meta, `div`), `ignore lowercase`).to.eql(undefined);
        expect(STSymbol.get(meta, `Btn`), `general symbols`).to.equal(CSSType.get(meta, `Btn`));
        expect(CSSType.getAll(meta), `getAll`).to.eql({
            Btn: CSSType.get(meta, `Btn`),
            Gallery: CSSType.get(meta, `Gallery`),
        });

        // public API
        expect(meta.getTypeElement(`Btn`), `meta.getTypeElement`).to.equal(
            CSSType.get(meta, `Btn`)
        );
        expect(meta.getAllTypeElements(), `meta.getAllTypeElements`).to.eql(CSSType.getAll(meta));

        // deprecation
        expect(
            ignoreDeprecationWarn(() => meta.elements),
            `deprecated 'meta.elements'`
        ).to.eql({
            Btn: CSSType.get(meta, `Btn`),
            Gallery: CSSType.get(meta, `Gallery`),
        });
    });
    it(`should report invalid cases`, () => {
        testStylableCore(`
            /* 
                @rule(functional element type) div()
                @analyze-error(functional element type) ${CSSType.diagnostics.INVALID_FUNCTIONAL_SELECTOR(
                    `div`,
                    `type`
                )}
            */
            div() {}
        `);
    });
    it(`should report unscoped native element type`, () => {
        /*
        ToDo: consider to accept as scoped when local symbol exists
        anywhere in the selector: "div .local span"
        */
        const { sheets } = testStylableCore(`
                /* @analyze-warn word(button) ${CSSType.diagnostics.UNSCOPED_TYPE_SELECTOR(
                    `button`
                )} */
                button {}

                /* NO ERROR - locally scoped */
                .local button {}
                button.local {}
            `);

        const { meta } = sheets[`/entry.st.css`];

        expect(meta.diagnostics.reports.length, `only unscoped diagnostic`).to.equal(1);
    });
    describe(`st-import`, () => {
        it(`should resolve imported root as element type`, () => {
            const { sheets } = testStylableCore({
                '/before.st.css': ``,
                '/after.st.css': ``,
                '/entry.st.css': `
                    /* @check .entry__root .before__root */
                    .root Before {}

                    @st-import Before from './before.st.css';
                    @st-import After from './after.st.css';

                    /* @check .entry__root .after__root */
                    .root After {}
                `,
            });

            const { meta, exports } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            // symbols
            const importBeforeDef = meta.getImportStatements()[0];
            const importAfterDef = meta.getImportStatements()[1];
            expect(CSSType.get(meta, `Before`), `before type symbol`).to.eql({
                _kind: `element`,
                name: 'Before',
                alias: STImport.createImportSymbol(importBeforeDef, `default`, `default`, `/`),
            });
            expect(CSSType.get(meta, `After`), `after type symbol`).to.eql({
                _kind: `element`,
                name: 'After',
                alias: STImport.createImportSymbol(importAfterDef, `default`, `default`, `/`),
            });

            // JS exports
            expect(exports.classes, `not added as classes exports`).to.eql({
                root: `entry__root`,
            });
        });
        it(`should resolve imported named as element type`, () => {
            const { sheets } = testStylableCore({
                '/before.st.css': `.part {}`,
                '/after.st.css': `.part {}`,
                '/entry.st.css': `
                    /* @check .entry__root .before__part */
                    .root BeforePart {}

                    @st-import [part as BeforePart] from './before.st.css';
                    @st-import [part as AfterPart] from './after.st.css';

                    /* @check .entry__root .after__part */
                    .root AfterPart {}
                `,
            });

            const { meta, exports } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            // symbols
            const importBeforeDef = meta.getImportStatements()[0];
            const importAfterDef = meta.getImportStatements()[1];
            expect(CSSType.get(meta, `BeforePart`), `before type symbol`).to.eql({
                _kind: `element`,
                name: 'BeforePart',
                alias: STImport.createImportSymbol(importBeforeDef, `named`, `BeforePart`, `/`),
            });
            expect(CSSType.get(meta, `AfterPart`), `after type symbol`).to.eql({
                _kind: `element`,
                name: 'AfterPart',
                alias: STImport.createImportSymbol(importAfterDef, `named`, `AfterPart`, `/`),
            });

            // JS exports
            expect(exports.classes, `not add as classes exports`).to.eql({
                root: `entry__root`,
            });
        });
        it(`should resolve deep imported element type`, () => {
            testStylableCore({
                '/base.st.css': ``,
                '/middle.st.css': `
                    @st-import Base from "./base.st.css";
                    Base {}
                `,
                '/entry.st.css': `
                    @st-import [Base] from './middle.st.css';

                    /* @rule .base__root */
                    Base {}
                `,
            });
        });
        it(`should report unscoped imported element type`, () => {
            testStylableCore({
                '/classes.st.css': `
                    .importedPart {}
                `,
                '/entry.st.css': `
                    @st-import [importedPart] from "./classes.st.css";

                    /* @analyze-warn word(importedPart) ${CSSType.diagnostics.UNSCOPED_TYPE_SELECTOR(
                        `importedPart`
                    )} */
                    importedPart {}
                `,
            });
        });
    });
    describe(`css-class`, () => {
        it(`should transform according to -st-global`, () => {
            const { sheets } = testStylableCore({
                '/other.st.css': `
                .root {
                    -st-global: ".x";
                }
                `,
                '/entry.st.css': `
                    @st-import Container from "./other.st.css";
                                
                    /* @check .entry__root .x */
                    .root Container {}
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
    });
});
