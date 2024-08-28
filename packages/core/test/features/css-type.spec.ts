import { STImport, CSSType, STSymbol } from '@stylable/core/dist/features';
import {
    testStylableCore,
    shouldReportNoDiagnostics,
    diagnosticBankReportToStrings,
} from '@stylable/core-test-kit';
import { expect } from 'chai';

const cssTypeDiagnostics = diagnosticBankReportToStrings(CSSType.diagnostics);

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
        expect(CSSType.get(meta, `Btn`), `collect capital letters`).to.deep.contain(
            CSSType.createSymbol({
                name: 'Btn',
            }),
        );
        expect(CSSType.get(meta, `div`), `ignore lowercase`).to.eql(undefined);
        expect(STSymbol.get(meta, `Btn`), `general symbols`).to.equal(CSSType.get(meta, `Btn`));
        expect(CSSType.getAll(meta), `getAll`).to.eql({
            Btn: CSSType.get(meta, `Btn`),
            Gallery: CSSType.get(meta, `Gallery`),
        });

        // public API
        expect(meta.getTypeElement(`Btn`), `meta.getTypeElement`).to.equal(
            CSSType.get(meta, `Btn`),
        );
        expect(meta.getAllTypeElements(), `meta.getAllTypeElements`).to.eql(CSSType.getAll(meta));
    });
    it(`should report invalid cases`, () => {
        testStylableCore(`
            /* 
                @rule(functional element type) div()
                @analyze-error(functional element type) ${cssTypeDiagnostics.INVALID_FUNCTIONAL_SELECTOR(
                    `div`,
                    `type`,
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
                /* @analyze-warn word(button) ${cssTypeDiagnostics.UNSCOPED_TYPE_SELECTOR(
                    `button`,
                )} */
                button {}

                /* NO ERROR - locally scoped */
                .local button {}
                button.local {}
            `);

        const { meta } = sheets[`/entry.st.css`];

        expect(meta.diagnostics.reports.length, `only unscoped diagnostic`).to.equal(1);
    });
    it('should set element inferred selector to context after native element', () => {
        testStylableCore({
            'comp.st.css': ` .part {} `,
            'entry.st.css': `
                @st-import Comp from './comp.st.css';
                .class { -st-states: state('.class-state'); }
            
                /* @rule(root state) .entry__class input:state */
                .class input:state {}
    
                /* @rule(unknown comp pseudo-element) .comp__root input::part */
                Comp input::part {}
    
                /* @rule(unknown standalone pseudo-element) .comp__root input::class */
                Comp input::class {}
            `,
        });
    });
    describe(`st-import`, () => {
        it(`should resolve imported root (default) as element type`, () => {
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
            expect(CSSType.get(meta, `Before`), `before type symbol`).to.eql(
                CSSType.createSymbol({
                    name: 'Before',
                    alias: STImport.createImportSymbol(importBeforeDef, `default`, `default`, `/`),
                }),
            );
            expect(CSSType.get(meta, `After`), `after type symbol`).to.eql(
                CSSType.createSymbol({
                    name: 'After',
                    alias: STImport.createImportSymbol(importAfterDef, `default`, `default`, `/`),
                }),
            );

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
            expect(CSSType.get(meta, `BeforePart`), `before type symbol`).to.eql(
                CSSType.createSymbol({
                    name: 'BeforePart',
                    alias: STImport.createImportSymbol(importBeforeDef, `named`, `BeforePart`, `/`),
                }),
            );
            expect(CSSType.get(meta, `AfterPart`), `after type symbol`).to.eql(
                CSSType.createSymbol({
                    name: 'AfterPart',
                    alias: STImport.createImportSymbol(importAfterDef, `named`, `AfterPart`, `/`),
                }),
            );

            // JS exports
            expect(exports.classes, `not add as classes exports`).to.eql({
                root: `entry__root`,
            });
        });
        it(`should resolve imported element type (no class)`, () => {
            // element type is not namespaced and should be avoided
            const { sheets } = testStylableCore({
                '/before.st.css': `Part {}`,
                '/after.st.css': `Part {}`,
                '/entry.st.css': `
                    /* @check .entry__root Part */
                    .root BeforePart {}

                    @st-import [Part as BeforePart] from './before.st.css';
                    @st-import [Part as AfterPart] from './after.st.css';

                    /* @check .entry__root Part */
                    .root AfterPart {}
                `,
            });

            const { meta, exports } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            // symbols
            const importBeforeDef = meta.getImportStatements()[0];
            const importAfterDef = meta.getImportStatements()[1];
            expect(CSSType.get(meta, `BeforePart`), `before type symbol`).to.eql(
                CSSType.createSymbol({
                    name: 'BeforePart',
                    alias: STImport.createImportSymbol(importBeforeDef, `named`, `BeforePart`, `/`),
                }),
            );
            expect(CSSType.get(meta, `AfterPart`), `after type symbol`).to.eql(
                CSSType.createSymbol({
                    name: 'AfterPart',
                    alias: STImport.createImportSymbol(importAfterDef, `named`, `AfterPart`, `/`),
                }),
            );
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
            // Todo: consider dropping support for class usage as an element type
            testStylableCore({
                '/classes.st.css': `
                    .importedPart {}
                `,
                '/entry.st.css': `
                    @st-import [importedPart] from "./classes.st.css";

                    /* @analyze-warn word(importedPart) ${cssTypeDiagnostics.UNSCOPED_TYPE_SELECTOR(
                        `importedPart`,
                    )} */
                    importedPart {}
                `,
            });
        });
    });
    describe(`st-mixin`, () => {
        it(`should mix element type`, () => {
            const { sheets } = testStylableCore({
                '/mixin.st.css': `
                    Mix {
                        color: green;
                    }
                `,
                '/entry.st.css': `
                    @st-import MixRoot, [Mix as mixType] from './mixin.st.css';

                    /* 
                        @rule(type) .entry__a { color: green } 
                    */
                    .a {
                        -st-mixin: mixType;
                    }

                    /* 
                        @rule(root.0)[0] .entry__a { } 
                        @rule(root.1)[1] .entry__a Mix { color: green } 
                    */
                    .a {
                        -st-mixin: MixRoot;
                    }
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it(`should mix element type alias`, () => {
            testStylableCore({
                '/mixin.st.css': `
                    Mix {
                        from: imported;
                    }
                `,
                '/entry.st.css': `
                    @st-import [Mix as MixType] from './mixin.st.css';
                    
                    MixType {
                        from: local;
                    }

                    /* 
                        @rule[0] .entry__a { from: imported; }
                        @rule[1] .entry__a { from: local; }
                    */
                    .a {
                        -st-mixin: MixType;
                    }
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
