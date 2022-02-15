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
            
            @media {
                /* @rule(complex) .entry__f*/
                .f {}
            }

            @st-scope body {
                /* @rule(complex) body .entry__g */
                .g {}
            }
        `);

        const { meta, exports } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        // symbols
        expect(CSSClass.get(meta, `root`), `default root symbol`).to.contain({
            name: 'root',
        });
        expect(CSSClass.get(meta, `a`), `a symbol`).to.contain({
            name: 'a',
        });
        expect(CSSClass.get(meta, `b`), `b symbol`).to.contain({
            name: 'b',
        });
        expect(CSSClass.get(meta, `c`), `c symbol`).to.contain({
            name: 'c',
        });
        expect(CSSClass.get(meta, `d`), `d symbol`).to.contain({
            name: 'd',
        });
        expect(CSSClass.get(meta, `e`), `e symbol`).to.contain({
            name: 'e',
        });
        expect(CSSClass.get(meta, `f`), `f symbol`).to.contain({
            name: 'f',
        });
        expect(CSSClass.get(meta, `g`), `g symbol`).to.contain({
            name: 'g',
        });

        // public API
        expect(meta.getClass(`root`), `a meta.getClass`).to.equal(CSSClass.get(meta, `root`));
        expect(meta.getClass(`a`), `a meta.getClass`).to.equal(CSSClass.get(meta, `a`));
        expect(meta.getClass(`b`), `b meta.getClass`).to.equal(CSSClass.get(meta, `b`));
        expect(meta.getClass(`c`), `c meta.getClass`).to.equal(CSSClass.get(meta, `c`));
        expect(meta.getClass(`d`), `d meta.getClass`).to.equal(CSSClass.get(meta, `d`));
        expect(meta.getClass(`e`), `e meta.getClass`).to.equal(CSSClass.get(meta, `e`));
        expect(meta.getClass(`f`), `f meta.getClass`).to.equal(CSSClass.get(meta, `f`));
        expect(meta.getClass(`g`), `g meta.getClass`).to.equal(CSSClass.get(meta, `g`));
        expect(meta.getAllClasses(), `meta.getAllClasses()`).to.eql({
            root: CSSClass.get(meta, `root`),
            a: CSSClass.get(meta, `a`),
            b: CSSClass.get(meta, `b`),
            c: CSSClass.get(meta, `c`),
            d: CSSClass.get(meta, `d`),
            e: CSSClass.get(meta, `e`),
            f: CSSClass.get(meta, `f`),
            g: CSSClass.get(meta, `g`),
        });
        expect(CSSClass.getAll(meta), `CSSClass.getAll(meta)`).to.eql(meta.getAllClasses());

        // JS exports
        expect(exports.classes.root, `root JS export`).to.eql(`entry__root`);
        expect(exports.classes.a, `a JS export`).to.eql(`entry__a`);
        expect(exports.classes.b, `b JS export`).to.eql(`entry__b`);
        expect(exports.classes.c, `c JS export`).to.eql(`entry__c`);
        expect(exports.classes.d, `d JS export`).to.eql(`entry__d`);
        expect(exports.classes.e, `e JS export`).to.eql(`entry__e`);
        expect(exports.classes.f, `f JS export`).to.eql(`entry__f`);
        expect(exports.classes.g, `g JS export`).to.eql(`entry__g`);

        // deprecation
        ignoreDeprecationWarn(() => {
            expect(meta.classes, `deprecated 'meta.classes'`).to.eql({
                root: CSSClass.get(meta, `root`),
                a: CSSClass.get(meta, `a`),
                b: CSSClass.get(meta, `b`),
                c: CSSClass.get(meta, `c`),
                d: CSSClass.get(meta, `d`),
                e: CSSClass.get(meta, `e`),
                f: CSSClass.get(meta, `f`),
                g: CSSClass.get(meta, `g`),
            });
        });
    });
    it(`should override with -st-global value`, () => {
        const { sheets } = testStylableCore(`
            /* @rule(simple class) .x */
            .a {
                -st-global: ".x";
            }

            /* @rule(compound classes) .z.zz */
            .b {
                -st-global: ".z.zz";
            }

            /* @rule(no class) [attr=val] */
            .c {
                -st-global: "[attr=val]";
            }
            
            /* @rule(complex) .y .z */
            .d {
                -st-global: ".y .z";
            }

            /* @rule(not only classes compound) .yy[attr] */
            .e {
                -st-global: ".yy[attr]";
            }
        `);

        const { meta, exports } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        // symbols
        expect(CSSClass.get(meta, `a`), `a symbol`).to.contain({
            name: 'a',
            // '-st-global': // ToDo: add
        });
        expect(CSSClass.get(meta, `b`), `b symbol`).to.contain({
            name: 'b',
        });
        expect(CSSClass.get(meta, `c`), `c symbol`).to.contain({
            name: 'c',
        });
        expect(CSSClass.get(meta, `d`), `d symbol`).to.contain({
            name: 'd',
        });
        expect(CSSClass.get(meta, `e`), `e symbol`).to.contain({
            name: 'e',
        });

        // meta.globals
        expect(meta.globals).to.eql({
            x: true,
            z: true,
            zz: true,
            y: true,
            yy: true,
        });

        // JS exports
        expect(exports.classes.a, `single JS export`).to.eql(`x`);
        expect(exports.classes.b, `multi JS export`).to.eql(`z zz`);
        expect(exports.classes.c, `no class selector JS export`).to.eql(undefined);
        expect(exports.classes.d, `complex selector JS export`).to.eql(undefined);
        expect(exports.classes.e, `not only classes compound JS export`).to.eql(undefined);
    });
    it(`should handle invalid -st-global value`, () => {
        // ToDo: it might be possible to support multiple selectors using custom-selector
        const { sheets } = testStylableCore(`
            /* @rule(empty) .entry__a */
            .a {
                /* @analyze-error(empty) ${CSSClass.diagnostics.EMPTY_ST_GLOBAL()} */
                -st-global: "";
            }

            /* @rule(empty) .y */
            .b {
                /* @analyze-error(multi) ${CSSClass.diagnostics.UNSUPPORTED_MULTI_SELECTORS_ST_GLOBAL()} */
                -st-global: ".y , .z";
            }
        `);

        const { meta, exports } = sheets['/entry.st.css'];

        // meta.globals
        expect(meta.globals).to.eql({
            y: true,
        });

        // JS exports
        expect(exports.classes.a, `a (empty) JS export`).to.eql(`entry__a`);
        expect(exports.classes.b, `b (multi) JS export`).to.eql(`y`);
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
    describe(`st-global`, () => {
        it(`should inline :global() content without collecting classes`, () => {
            const { sheets } = testStylableCore(`
                /* @rule(simple selector) .a */
                :global(.a) {}
    
                /* @rule(complex selector) .entry__root .b */
                .root :global(.b) {}
    
                /* @rule(complex global) div.c */
                :global(div.c) {}
            `);

            const { meta, exports } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            // symbols
            expect(CSSClass.get(meta, `a`), `a symbol`).to.equal(undefined);
            expect(CSSClass.get(meta, `b`), `b symbol`).to.equal(undefined);
            expect(CSSClass.get(meta, `c`), `c symbol`).to.equal(undefined);

            // meta.globals
            expect(meta.globals).to.eql({
                a: true,
                b: true,
                c: true,
            });

            // JS exports
            expect(exports.classes.a, `a JS export`).to.eql(undefined);
            expect(exports.classes.b, `b JS export`).to.eql(undefined);
            expect(exports.classes.c, `c JS export`).to.eql(undefined);
        });
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
        it(`should handle unknown imported class`, () => {
            const { sheets } = testStylableCore({
                '/classes.st.css': ``,
                '/entry.st.css': `
                    @st-import [unknown] from './classes.st.css';

                    /* 
                        @rule .entry__unknown
                        @transform-error(unresolved alias) word(unknown) ${CSSClass.diagnostics.UNKNOWN_IMPORT_ALIAS(
                            `unknown`
                        )} 
                    */
                    .unknown {}
                `,
            });

            const { meta, exports } = sheets[`/entry.st.css`];

            // symbols
            const importDef = meta.getImportStatements()[0];
            expect(CSSClass.get(meta, `unknown`), `unknown symbol`).to.eql({
                _kind: `class`,
                name: 'unknown',
                alias: STImport.createImportSymbol(importDef, `named`, `unknown`, `/`),
            });

            // JS exports
            expect(exports.classes[`unknown`], `unknown JS export`).to.eql(
                undefined // ToDo: consider exporting `entry__unknown-alias`
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
                    /* @analyze-warn ${STSymbol.diagnostics.REDECLARE_ROOT()} */
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
            const { sheets } = testStylableCore({
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

            const { meta, exports } = sheets['/entry.st.css'];

            // symbols
            expect(CSSClass.get(meta, `iRoot`), `iRoot symbol`).to.contain({
                name: 'iRoot',
            });
            expect(CSSClass.get(meta, `iPart`), `iPart symbol`).to.contain({
                name: 'iPart',
            });

            // meta.globals
            expect(meta.globals).to.eql({
                r: true,
                p: true,
            });

            // JS exports
            expect(exports.classes, `no root alias JS export`).to.not.haveOwnProperty(`iRoot`);
            expect(exports.classes.iPart, `class alias JS export`).to.eql(`p`);
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
        it(`should handle -st-extends of deep imported class`, () => {
            const { sheets } = testStylableCore({
                '/classes.st.css': `
                    .imported {}
                `,
                '/middle.st.css': `
                    @st-import [imported as importedAlias] from './classes.st.css';
                    .importedAlias {}
                    .importedExtend {
                        -st-extends: importedAlias;
                    }
                `,
                '/extended.st.css': `
                    @st-import [importedExtend] from './middle.st.css';

                    /* @rule .extended__root */
                    .root {
                        -st-extends: importedExtend;
                    }

                    /* @rule .extended__class */
                    .class {
                        -st-extends: importedExtend;
                    }
                `,
                '/aliased.st.css': `
                    @st-import [importedAlias] from './middle.st.css';

                    /* @rule .aliased__root */
                    .root {
                        -st-extends: importedAlias;
                    }

                    /* @rule .aliased__class */
                    .class {
                        -st-extends: importedAlias;
                    }
                `,
            });

            const extended = sheets['/extended.st.css'];
            const aliased = sheets['/aliased.st.css'];

            shouldReportNoDiagnostics(extended.meta);
            shouldReportNoDiagnostics(aliased.meta);

            // JS exports
            expect(extended.exports.classes.root, `root extended`).to.eql(
                `extended__root middle__importedExtend classes__imported`
            );
            expect(extended.exports.classes.class, `class extended`).to.eql(
                `extended__class middle__importedExtend classes__imported`
            );
            expect(aliased.exports.classes.root, `root aliased`).to.eql(
                `aliased__root classes__imported`
            );
            expect(aliased.exports.classes.class, `class aliased`).to.eql(
                `aliased__class classes__imported`
            );
        });
        it(`should handle -st-extends of deep imported root`, () => {
            const { sheets } = testStylableCore({
                '/deep.st.css': ``,
                '/middle.st.css': `
                    @st-import [root as DeepAlias] from './deep.st.css';
                    .DeepAlias {}
                    .deepExtend {
                        -st-extends: DeepAlias;
                    }
                `,
                '/extended.st.css': `
                    @st-import [deepExtend] from './middle.st.css';

                    /* @rule .extended__root */
                    .root {
                        -st-extends: deepExtend;
                    }

                    /* @rule .extended__class */
                    .class {
                        -st-extends: deepExtend;
                    }
                `,
                '/aliased.st.css': `
                    @st-import [DeepAlias] from './middle.st.css';

                    /* @rule .aliased__root */
                    .root {
                        -st-extends: DeepAlias;
                    }

                    /* @rule .aliased__class */
                    .class {
                        -st-extends: DeepAlias;
                    }
                `,
            });

            const extended = sheets['/extended.st.css'];
            const aliased = sheets['/aliased.st.css'];

            shouldReportNoDiagnostics(extended.meta);
            shouldReportNoDiagnostics(aliased.meta);

            // JS exports
            expect(extended.exports.classes.root, `root extended`).to.eql(
                `extended__root middle__deepExtend`
            );
            expect(extended.exports.classes.class, `class extended`).to.eql(
                `extended__class middle__deepExtend`
            );
            expect(aliased.exports.classes.root, `root aliased`).to.eql(`aliased__root`);
            expect(aliased.exports.classes.class, `class aliased`).to.eql(`aliased__class`);
        });
        it(`should handle -st-extends of un-supported imported cases`, () => {
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
