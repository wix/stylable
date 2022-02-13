import { STImport, CSSClass, STSymbol } from '@stylable/core/dist/features';
import { ignoreDeprecationWarn } from '@stylable/core/dist/helpers/deprecation';
import { testStylableCore, shouldReportNoDiagnostics } from '@stylable/core-test-kit';
import { expect } from 'chai';

describe(`features/css-class`, () => {
    it(`should have root class`, () => {
        const { sheets } = testStylableCore({
            '/auto.st.css': ``,
            '/explicit.st.css': `
                /* @rule .explicit__root */
                .root {}
            `,
        });

        const autoResult = sheets['/auto.st.css'];
        const explicitResult = sheets['/explicit.st.css'];

        shouldReportNoDiagnostics(autoResult.meta);

        // symbols
        expect(CSSClass.get(autoResult.meta, `root`), `auto root symbol`).to.contain({
            _kind: `class`,
            name: 'root',
        });
        expect(CSSClass.get(explicitResult.meta, `root`), `explicit root symbol`).to.contain({
            _kind: `class`,
            name: 'root',
        });

        // JS exports
        expect(autoResult.exports.classes.root, `auto root JS export`).to.eql(`auto__root`);
        expect(explicitResult.exports.classes.root, `explicit root JS export`).to.eql(
            `explicit__root`
        );
    });
    it(`should process css class selectors`, () => {
        const { sheets } = testStylableCore(`
            /* @rule(single) .entry__a */
            .a {}

            /* @rule(multi) .entry__b, .entry__c */
            .b, .c {}

            /* @rule(complex) .entry__d .entry__e*/
            .d .e {}
        `);

        const { meta, exports } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        // symbols
        expect(CSSClass.get(meta, `root`), `default root symbol`).to.contain({
            _kind: `class`,
            name: 'root',
        });
        expect(CSSClass.get(meta, `a`), `a symbol`).to.contain({
            _kind: `class`,
            name: 'a',
        });
        expect(CSSClass.get(meta, `b`), `b symbol`).to.contain({
            _kind: `class`,
            name: 'b',
        });
        expect(CSSClass.get(meta, `c`), `c symbol`).to.contain({
            _kind: `class`,
            name: 'c',
        });
        expect(CSSClass.get(meta, `d`), `d symbol`).to.contain({
            _kind: `class`,
            name: 'd',
        });
        expect(CSSClass.get(meta, `e`), `e symbol`).to.contain({
            _kind: `class`,
            name: 'e',
        });

        // public API
        expect(meta.getClass(`root`), `a meta.getClass`).to.equal(CSSClass.get(meta, `root`));
        expect(meta.getClass(`a`), `a meta.getClass`).to.equal(CSSClass.get(meta, `a`));
        expect(meta.getClass(`b`), `b meta.getClass`).to.equal(CSSClass.get(meta, `b`));
        expect(meta.getClass(`c`), `c meta.getClass`).to.equal(CSSClass.get(meta, `c`));
        expect(meta.getClass(`d`), `d meta.getClass`).to.equal(CSSClass.get(meta, `d`));
        expect(meta.getClass(`e`), `e meta.getClass`).to.equal(CSSClass.get(meta, `e`));

        // JS exports
        expect(exports.classes.root, `root JS export`).to.eql(`entry__root`);
        expect(exports.classes.a, `a JS export`).to.eql(`entry__a`);
        expect(exports.classes.b, `b JS export`).to.eql(`entry__b`);
        expect(exports.classes.c, `c JS export`).to.eql(`entry__c`);
        expect(exports.classes.d, `d JS export`).to.eql(`entry__d`);
        expect(exports.classes.e, `e JS export`).to.eql(`entry__e`);

        // deprecation
        ignoreDeprecationWarn(() => {
            expect(meta.classes, `deprecated 'meta.classes'`).to.eql({
                root: CSSClass.get(meta, `root`),
                a: CSSClass.get(meta, `a`),
                b: CSSClass.get(meta, `b`),
                c: CSSClass.get(meta, `c`),
                d: CSSClass.get(meta, `d`),
                e: CSSClass.get(meta, `e`),
            });
        });
    });
    it(`should add to general symbols`, () => {
        const { sheets } = testStylableCore(`
            /* @rule .entry__btn */
            .btn {}
            /* @rule .entry__icon */
            .icon {}
        `);

        const { meta } = sheets['/entry.st.css'];

        expect(CSSClass.get(meta, `root`), `root general symbol`).to.equal(
            STSymbol.get(meta, `root`)
        );
        expect(STSymbol.get(meta, `btn`), `btn general symbol`).to.equal(CSSClass.get(meta, `btn`));
        expect(STSymbol.get(meta, `icon`), `icon general symbol`).to.equal(
            CSSClass.get(meta, `icon`)
        );

        expect(meta.getAllClasses(), `meta.getAllClasses()`).to.eql({
            root: CSSClass.get(meta, `root`),
            btn: CSSClass.get(meta, `btn`),
            icon: CSSClass.get(meta, `icon`),
        });
        expect(CSSClass.getAll(meta), `CSSClass.getAll(meta)`).to.eql(meta.getAllClasses());
    });
    it(`should override with -st-global value`, () => {
        const { sheets } = testStylableCore(`
            /* @rule(simple class) .x */
            .a {
                -st-global: ".x";
            }

            /* @rule .z.zz */
            .b {
                -st-global: ".z.zz";
            }
        `);

        const { meta, exports } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        // symbols
        expect(CSSClass.get(meta, `a`), `a symbol`).to.contain({
            _kind: `class`,
            name: 'a',
            // '-st-global': // ToDo: add
        });
        expect(CSSClass.get(meta, `b`), `b symbol`).to.contain({
            _kind: `class`,
            name: 'b',
            // '-st-global': // ToDo: add
        });

        // JS exports - ToDo: fix - export correctly if possible or don't export at all
        expect(exports.classes.a, `a JS export`).to.eql(`entry__a`);
        expect(exports.classes.b, `b JS export`).to.eql(`entry__b`);
    });
    it(`should override with :global() value`, () => {
        const { sheets } = testStylableCore(`
            /* @rule(simple selector) .a */
            :global(.a) {}

            /* @rule(complex selector) .entry__root .b */
            .root :global(.b) {}
        `);

        const { meta, exports } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        // symbols
        expect(CSSClass.get(meta, `a`), `a symbol`).to.equal(undefined);
        expect(CSSClass.get(meta, `b`), `b symbol`).to.equal(undefined);

        // JS exports
        expect(exports.classes.a, `a JS export`).to.eql(undefined);
        expect(exports.classes.b, `b JS export`).to.eql(undefined);
    });
    it(`should escape`, () => {
        const { sheets } = testStylableCore(
            `
            /* @rule .entry\\.__a\\. */
            .a\\. {}
        `,
            {
                stylableConfig: {
                    resolveNamespace(namespace) {
                        // add . character that needs escaping in CSS
                        return namespace + `.`;
                    },
                },
            }
        );

        const { meta, exports } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        // symbols - ToDo: remove escape from key?
        expect(CSSClass.get(meta, `a\\.`), `symbol`).to.contain({
            _kind: `class`,
            name: 'a\\.',
        });

        // JS exports - ToDo: remove escape from key
        expect(exports.classes[`a\\.`], `JS export`).to.eql(`entry.__a.`);
    });
    it(`should handle -st-extends`, () => {
        const { sheets } = testStylableCore(`
            .a {}

            /* @rule(root extend class) .entry__root */
            .root {
                -st-extends: a;
            }

            /* @rule(class extend class) .entry__class */
            .class {
                -st-extends: a;
            }
        `);

        const { meta, exports } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        // symbols
        expect(CSSClass.get(meta, `root`), `root symbol`).to.contain({
            name: 'root',
        });
        expect(CSSClass.get(meta, `class`), `extend-class symbol`).to.contain({
            name: 'class',
        });

        // JS exports
        expect(exports.classes.root, `root compose JS export`).to.eql(`entry__root entry__a`);
        expect(exports.classes.class, `class compose JS export`).to.eql(`entry__class entry__a`);
    });
    it(`should report invalid cases`, () => {
        const { sheets } = testStylableCore(`
            /* 
                @rule(functional class) .entry__a()
                @analyze-error(functional class) ${CSSClass.diagnostics.INVALID_FUNCTIONAL_SELECTOR(
                    `.a`,
                    `class`
                )}
            */
            .a() {}
        `);

        const { meta, exports } = sheets['/entry.st.css'];

        // symbols
        expect(CSSClass.get(meta, `a`), `symbol`).to.contain({
            _kind: `class`,
            name: 'a',
        });

        // JS exports
        expect(exports.classes.a, `JS export`).to.eql(`entry__a`);
    });
    describe(`st-import`, () => {
        it(`should resolve imported classes`, () => {
            const { sheets } = testStylableCore({
                '/classes.st.css': `
                    .before {}
                    .after {}
                    .unused {}
                `,
                '/entry.st.css': `
                    .root .before {}

                    @st-import [before, after, unused] from './classes.st.css';

                    .root .after {}
                `,
            });

            const { meta, exports } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            // symbols
            const importDef = meta.getImportStatements()[0];
            expect(CSSClass.get(meta, `before`), `before symbol`).to.eql({
                _kind: `class`,
                name: 'before',
                alias: STImport.createImportSymbol(importDef, `named`, `before`, `/`),
            });
            expect(CSSClass.get(meta, `after`), `after symbol`).to.eql({
                _kind: `class`,
                name: 'after',
                alias: STImport.createImportSymbol(importDef, `named`, `after`, `/`),
            });
            expect(CSSClass.get(meta, `unused`), `unused symbol`).to.eql(undefined);

            // JS exports
            expect(exports.classes.before, `before JS export`).to.eql(`classes__before`);
            expect(exports.classes.after, `after JS export`).to.eql(`classes__after`);
            expect(exports.classes.unused, `unused JS export`).to.eql(undefined);
        });
        it(`should resolve imported alias classes`, () => {
            const { sheets } = testStylableCore({
                '/classes.st.css': `
                    .imported-part {}
                `,
                '/entry.st.css': `
                    @st-import [imported-part, unknown-alias] from './classes.st.css';

                    /*
                        @rule(alias) .classes__imported-part
                    */
                    .imported-part {}

                    /* 
                        @rule .entry__unknown-alias
                        @transform-error(unresolved alias) word(unknown-alias) ${CSSClass.diagnostics.UNKNOWN_IMPORT_ALIAS(
                            `unknown-alias`
                        )} 
                    */
                    .unknown-alias {}
                `,
            });

            const { meta, exports } = sheets[`/entry.st.css`];

            // symbols
            const importDef = meta.getImportStatements()[0];
            expect(CSSClass.get(meta, `imported-part`), `imported-part symbol`).to.eql({
                _kind: `class`,
                name: 'imported-part',
                alias: STImport.createImportSymbol(importDef, `named`, `imported-part`, `/`),
            });
            expect(CSSClass.get(meta, `unknown-alias`), `unknown-alias symbol`).to.eql({
                _kind: `class`,
                name: 'unknown-alias',
                alias: STImport.createImportSymbol(importDef, `named`, `unknown-alias`, `/`),
            });

            // JS exports
            expect(exports.classes[`imported-part`], `imported-part JS export`).to.eql(
                `classes__imported-part`
            );
            expect(exports.classes[`unknown-alias`], `unknown-alias JS export`).to.eql(
                `` // ToDo: consider exporting `entry__unknown-alias`
            );
        });
        it(`should resolve deep imported alias classes`, () => {
            const { sheets } = testStylableCore({
                '/classes.st.css': `
                    .imported-part {}
                `,
                '/middle.st.css': `
                    @st-import [imported-part] from './classes.st.css';
                    .imported-part {}
                `,
                '/entry.st.css': `
                    @st-import [imported-part] from './middle.st.css';

                    /*
                        @rule(alias) .classes__imported-part
                    */
                    .imported-part {}
                `,
            });

            const { meta, exports } = sheets[`/entry.st.css`];

            // symbols
            const importDef = meta.getImportStatements()[0];
            expect(CSSClass.get(meta, `imported-part`), `imported-part symbol`).to.eql({
                _kind: `class`,
                name: 'imported-part',
                alias: STImport.createImportSymbol(importDef, `named`, `imported-part`, `/`),
            });

            // JS exports
            expect(exports.classes[`imported-part`], `imported-part JS export`).to.eql(
                `classes__imported-part`
            );
        });
        it(`should not override root`, () => {
            const { sheets } = testStylableCore({
                '/other.st.css': ``,
                '/entry.st.css': `
                    /* ToDo: test re-declare diagnostic */
                    @st-import [root] from './other.st.css';

                    /* @rule .entry__root */
                    .root{}
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            // symbols
            expect(CSSClass.get(meta, `root`), `class`).to.eql({
                _kind: `class`,
                name: 'root',
                '-st-root': true,
                alias: undefined,
            });
            expect(STSymbol.get(meta, `root`), `general`).to.equal(CSSClass.get(meta, `root`));
        });
        it(`should report unscoped class`, () => {
            /*
            ToDo: consider to accept as scoped when local symbol exists
            anywhere in the selector: ".importedPart .local div"
            */
            const { sheets } = testStylableCore({
                '/classes.st.css': `
                    .importedPart {}
                `,
                '/entry.st.css': `
                    @st-import [importedPart] from "./classes.st.css";

                    /* @analyze-warn word(importedPart) ${CSSClass.diagnostics.UNSCOPED_CLASS(
                        `importedPart`
                    )} */
                    .importedPart {}

                    /* NO ERROR - locally scoped */
                    .local .importedPart {}
                    .local.importedPart {}
                    .importedPart.local {}
                `,
            });

            const { meta } = sheets[`/entry.st.css`];

            expect(meta.diagnostics.reports.length, `only unscoped diagnostic`).to.equal(1);
        });
        it(`should override with imported -st-global`, () => {
            testStylableCore({
                '/comp.st.css': `
                    .root {
                        -st-global: .r;
                    }
                    .part {
                        -st-global: .p;
                    }
                `,
                '/entry.st.css': `
                    @st-import Comp, [root as iRoot, part as iPart] from './comp.st.css';

                    /* @rule .r */
                    Comp {}
                    
                    /* @rule .r */
                    .iRoot {}

                    /* @rule .p */
                    .iPart {}
                `,
            });
        });
        it(`should handle -st-extends of imported class `, () => {
            const { sheets } = testStylableCore({
                '/classes.st.css': `
                    .imported {}
                `,
                '/entry.st.css': `
                    @st-import [imported] from './classes.st.css';

                    /* @rule .entry__root */
                    .root {
                        -st-extends: imported;
                    }

                    /* @rule .entry__class */
                    .class {
                        -st-extends: imported;
                    }
                `,
            });

            const { meta, exports } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            // symbols
            expect(CSSClass.get(meta, `imported`), `imported symbol`).to.eql(undefined);
            expect(CSSClass.get(meta, `root`), `root symbol`).to.contain({
                _kind: `class`,
                name: 'root',
                alias: undefined,
            });
            expect(CSSClass.get(meta, `class`), `class symbol`).to.contain({
                _kind: `class`,
                name: 'class',
                alias: undefined,
            });

            // JS exports
            expect(exports.classes.root, `root compose JS export`).to.eql(
                `entry__root classes__imported`
            );
            expect(exports.classes.class, `class compose JS export`).to.eql(
                `entry__class classes__imported`
            );
            expect(exports.classes.imported, `no imported JS export`).to.eql(undefined);
        });
        it(`should handle -st-extends of imported root `, () => {
            const { sheets } = testStylableCore({
                '/classes.st.css': ``,
                '/entry.st.css': `
                    @st-import ImportedRoot from './classes.st.css';

                    /* @rule .entry__root */
                    .root {
                        -st-extends: ImportedRoot;
                    }

                    /* @rule .entry__class */
                    .class {
                        -st-extends: ImportedRoot;
                    }
                `,
            });

            const { meta, exports } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            // symbols
            expect(CSSClass.get(meta, `root`), `root symbol`).to.contain({
                _kind: `class`,
                name: 'root',
                alias: undefined,
            });
            expect(CSSClass.get(meta, `class`), `class symbol`).to.contain({
                _kind: `class`,
                name: 'class',
                alias: undefined,
            });

            // JS exports
            expect(exports.classes.root, `root extended JS export`).to.eql(`entry__root`);
            expect(exports.classes.class, `class extended JS export`).to.eql(`entry__class`);
        });
        it(`should handle -st-extends of deep imports`, () => {
            const { sheets } = testStylableCore({
                '/classes.st.css': `
                    .imported {}
                `,
                '/middle.st.css': `
                    @st-import [imported] from './classes.st.css';
                    .imported {}
                    .extended {
                        -st-extends: imported;
                    }
                `,
                '/entry.st.css': `
                    @st-import [imported, extended] from './middle.st.css';

                    /* @rule(pass through) .entry__a */
                    .a {
                        -st-extends: imported;
                    }
                    
                    /* @rule(extended import) .entry__b */
                    .b {
                        -st-extends: extended;
                    }
                    
                    /* @rule(extended local) .entry__c */
                    .c {
                        -st-extends: b;
                    }
                `,
            });

            const { meta, exports } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            // JS exports
            expect(exports.classes.a, `a JS export`).to.eql(`entry__a classes__imported`);
            expect(exports.classes.b, `b JS export`).to.eql(
                `entry__b middle__extended classes__imported`
            );
            expect(exports.classes.c, `c JS export`).to.eql(
                `entry__c entry__b middle__extended classes__imported`
            );
        });
        it(`should handle un-supported -st-extends imported cases`, () => {
            testStylableCore({
                '/code.js': ``,
                '/sheet.st.css': `
                    :vars {
                        stColor: red;
                    }
                `,
                '/entry.st.css': `
                    @st-import JS from './code';
                    @st-import [unknown, stColor] from './sheet.st.css';

                    .a {
                        /* @transform-error(javascript) word(JS) ${CSSClass.diagnostics.CANNOT_EXTEND_JS()} */
                        -st-extends: JS;
                    }
                    
                    .b {
                        /* @transform-error(unresolved named) word(unknown) ${CSSClass.diagnostics.CANNOT_EXTEND_UNKNOWN_SYMBOL(
                            `unknown`
                        )} */
                        -st-extends: unknown;
                    }
                    
                    .c {
                        /* @transform-error(unsupported symbol) word(stColor) ${CSSClass.diagnostics.IMPORT_ISNT_EXTENDABLE()} */
                        -st-extends: stColor;
                    }
                `,
            });
        });
    });
});
