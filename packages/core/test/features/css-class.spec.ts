import { STImport, CSSClass, STSymbol } from '@stylable/core/dist/features';
import {
    testStylableCore,
    shouldReportNoDiagnostics,
    diagnosticBankReportToStrings,
} from '@stylable/core-test-kit';
import { expect } from 'chai';
import type * as postcss from 'postcss';

const classDiagnostics = diagnosticBankReportToStrings(CSSClass.diagnostics);
const stSymbolDiagnostics = diagnosticBankReportToStrings(STSymbol.diagnostics);
const stImportDiagnostics = diagnosticBankReportToStrings(STImport.diagnostics);

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
                /* @analyze-error(empty) ${classDiagnostics.EMPTY_ST_GLOBAL()} */
                -st-global: "";
            }

            /* @rule(empty) .y */
            .b {
                /* @analyze-error(multi) ${classDiagnostics.UNSUPPORTED_MULTI_SELECTORS_ST_GLOBAL()} */
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
                @analyze-error(functional class) ${classDiagnostics.INVALID_FUNCTIONAL_SELECTOR(
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
    describe('st-extends', () => {
        it('should add inherit check rule in dev mode', () => {
            const fs = {
                '/deep.st.css': ``,
                '/mid.st.css': `
                    @st-import Deep from './deep.st.css';
                    .root Deep {}
                `,
                '/entry.st.css': `
                    @st-import [Deep] from './mid.st.css';
                    .root {
                        -st-extends: Deep;
                    }
                    /*another rule to check that dev rule is not added for every occurrence*/
                    .root {}
                `,
            };

            const {
                sheets: {
                    '/entry.st.css': { meta: devEntry },
                },
            } = testStylableCore(fs, {
                stylableConfig: {
                    mode: 'development',
                },
            });
            const {
                sheets: {
                    '/entry.st.css': { meta: prodEntry },
                },
            } = testStylableCore(fs, {
                stylableConfig: {
                    mode: 'production',
                },
            });

            const devActual = devEntry.targetAst!.toString().replace(/\s\s+/g, ' ');
            const prodActual = prodEntry.targetAst?.toString().replace(/\s\s+/g, ' ');
            const expected = CSSClass.createWarningRule(
                '.root',
                '.deep__root',
                'deep.st.css',
                '.root',
                '.entry__root',
                'entry.st.css'
            )
                .toString()
                .replace('!important\n', '!important;\n')
                .replace(/\s\s+/g, ' ');

            expect(devActual, 'development').to.contain(expected);
            expect(devActual.split(expected).length, 'only a single added rule').to.eql(2);
            expect(prodActual, 'production').to.not.contain(expected);
        });
        it('should not add inherit check rule for mixin', () => {
            const { sheets } = testStylableCore(
                {
                    '/deep.st.css': ``,
                    '/mid.st.css': `
                    @st-import Deep from './deep.st.css';
                    .root Deep {}
                `,
                    '/entry.st.css': `
                    @st-import [Deep] from './mid.st.css';
                    .root {
                        -st-mixin: Deep;
                    }
                `,
                },
                {
                    stylableConfig: { mode: 'development' },
                }
            );

            const { meta } = sheets['/entry.st.css'];

            expect((meta.targetAst!.nodes[0] as postcss.Rule).selector).to.equal('.entry__root');
            expect(meta.targetAst!.nodes.length).to.equal(1);
        });
        it('should use -st-global in inherit check', () => {
            const { sheets } = testStylableCore(
                {
                    '/x.st.css': `
                        .root {
                            -st-global: ".y";
                        }
                    `,
                    '/entry.st.css': `
                        @st-import X from './x.st.css';
                        .root {
                            -st-extends: X;
                        }
                    `,
                },
                {
                    stylableConfig: { mode: 'development' },
                }
            );

            const { meta } = sheets['/entry.st.css'];

            const actual = meta.targetAst!.toString().replace(/\s\s+/g, ' ');
            const expected = CSSClass.createWarningRule(
                '.root',
                '.y',
                'x.st.css',
                '.root',
                '.entry__root',
                'entry.st.css'
            )
                .toString()
                .replace('!important\n', '!important;\n')
                .replace(/\s\s+/g, ' ');

            expect(actual).to.contain(expected);
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
            expect(exports.classes.unused, `unused JS export`).to.eql(`classes__unused`);
        });
        it(`should handle unknown imported class`, () => {
            const { sheets } = testStylableCore({
                '/classes.st.css': ``,
                '/entry.st.css': `
                    @st-import [unknown] from './classes.st.css';

                    /* 
                        @rule .entry__unknown
                        @transform-error(unresolved alias) word(unknown) ${classDiagnostics.UNKNOWN_IMPORT_ALIAS(
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
                    /* @analyze-error ${stSymbolDiagnostics.REDECLARE_ROOT()} */
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

                    /* @analyze-warn word(importedPart) ${classDiagnostics.UNSCOPED_CLASS(
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
                    .extended {
                        -st-global: .e;
                    }
                `,
                '/entry.st.css': `
                    @st-import Comp, [root as iRoot, part as iPart, extended as iExtended] from './comp.st.css';

                    /* @rule .r */
                    Comp {}
                    
                    /* @rule .r */
                    .iRoot {}

                    /* @rule .p */
                    .iPart {}

                    /* @rule .entry__local */
                    .local {
                        -st-extends: iExtended;
                    }
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
                e: true,
            });

            // JS exports
            expect(exports.classes, `no root alias JS export`).to.not.haveOwnProperty(`iRoot`);
            expect(exports.classes.iPart, `class alias JS export`).to.eql(`p`);
            expect(exports.classes.local, `extending class JS export`).to.eql(`entry__local e`);
            expect(exports.classes.iExtended, `class alias JS export (2)`).to.eql(`e`);
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
            expect(exports.classes.imported, `used only by extends JS export`).to.eql(
                `classes__imported`
            );
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
                        /* @transform-error(javascript) word(JS) ${classDiagnostics.CANNOT_EXTEND_JS()} */
                        -st-extends: JS;
                    }
                    
                    .b {
                        /* @transform-error(unresolved named) word(unknown) ${classDiagnostics.CANNOT_EXTEND_UNKNOWN_SYMBOL(
                            `unknown`
                        )} */
                        -st-extends: unknown;
                    }
                    
                    .c {
                        /* @transform-error(unsupported symbol) word(stColor) ${classDiagnostics.IMPORT_ISNT_EXTENDABLE()} */
                        -st-extends: stColor;
                    }
                `,
            });
        });
    });
    describe(`css-pseudo-class`, () => {
        // ToDo: move to css-pseudo-class spec once feature is created
        describe(`st-var`, () => {
            it('should unsupported value() within var definition / call', () => {
                const { sheets } = testStylableCore(`
                    :vars {
                        optionA: a;
                        optionB: b;
                        optionC: c;
                    }

                    .root {
                        -st-states: 
                            option(enum(
                                value(optionA),
                                value(optionB)
                            )) value(optionB);
                    }

                    /* @rule(default) .entry__root.entry---option-1-b */
                    .root:option {}

                    /* @rule(target value) .entry__root.entry---option-1-a */
                    .root:option(value(optionA)) {}
                    
                    /* 
                        @x-transform-error(target invalid) invalid optionC
                        @rule(target invalid) .entry__root.entry---option-1-c 
                    */
                    .root:option(value(optionC)) {}
                `);

                const { meta } = sheets['/entry.st.css'];

                shouldReportNoDiagnostics(meta); // ToDo: `target invalid` should report
            });
        });
        describe(`st-mixin`, () => {
            it.skip('should override value() within var definition / call', () => {
                // mixins could be able to gain more power by overriding st-var in state definitions and selectors
                const { sheets } = testStylableCore(`
                    :vars {
                        optionA: a;
                        optionB: b;
                        optionC: c;
                        optionD: c;
                    }
    
                    .mix {
                        -st-states: 
                            option(enum(
                                value(optionA),
                                value(optionB)
                            )) value(optionB);
                    }
                    .mix:option {}
                    .mix:option(value(optionA)) {}

                    /* 
                        @rule[1](default) .entry__into.entry---option-1-d 
                        @rule[2](target value) .entry__into.entry---option-1-c 
                    */
                    .into {
                        -st-mixin: mix(
                            optionA value(optionC),
                            optionB value(optionD)
                        );
                    }
                `);

                const { meta } = sheets['/entry.st.css'];

                shouldReportNoDiagnostics(meta);
            });
            it(`should mix custom state`, () => {
                const { sheets } = testStylableCore({
                    '/base.st.css': `
                        .root {
                            -st-states: toggled;
                        }
                        .root:toggled {
                            value: from base;
                        }
                    `,
                    '/extend.st.css': `
                        @st-import Base from './base.st.css';
                        Base {}
                        .root {
                            -st-extends: Base;
                        }
                        .root:toggled {
                            value: from extend;
                        }
                    `,
                    '/entry.st.css': `
                        @st-import Extend, [Base] from './extend.st.css';
    
                        /* @rule[1] 
                        .entry__a.base--toggled {
                            value: from base;
                        } */
                        .a {
                            -st-mixin: Base;
                        }

                        /* 
                        ToDo: change to 1 once empty AST is filtered
                        @rule[2] 
                        .entry__a.base--toggled {
                            value: from extend;
                        } */
                        .a {
                            -st-mixin: Extend;
                        }
                    `,
                });

                const { meta } = sheets['/entry.st.css'];

                shouldReportNoDiagnostics(meta);
            });
            it(`should mix imported class with custom-pseudo-state`, () => {
                // ToDo: fix case where extend.st.css has .root between mix rules: https://shorturl.at/cwBMP
                const { sheets } = testStylableCore({
                    '/base.st.css': `
                        .root {
                            /* not going to be mixed through -st-extends */
                            id: base-root;
                            -st-states: state;
                        }
                    `,
                    '/extend.st.css': `
                        @st-import Base from './base.st.css';
                        .root {
                            -st-extends: Base;
                        }
                        .mix {
                            -st-extends: Base;
                            id: extend-mix;
                        }
                        .mix:state {
                            id: extend-mix-state;
                        };
                        .root:state {
                            id: extend-root-state;
                        }

                    `,
                    '/enrich.st.css': `
                        @st-import MixRoot, [mix as mixClass] from './extend.st.css';
                        MixRoot {
                            id: enrich-MixRoot;
                        }
                        MixRoot:state {
                            id: enrich-MixRoot-state;
                        }
                        .mixClass {
                            id: enrich-mixClass;
                        }
                        .mixClass:state {
                            id: enrich-mixClass-state;
                        }
                    `,
                    '/entry.st.css': `
                        @st-import [MixRoot, mixClass] from './enrich.st.css';

                        /*
                            @rule[0] .entry__a { -st-extends: Base; id: extend-mix; }
                            @rule[1] .entry__a.base--state { id: extend-mix-state; }
                            @rule[2] .entry__a { id: enrich-mixClass; }
                            @rule[3] .entry__a.base--state { id: enrich-mixClass-state; }
                        */
                        .a {
                            -st-mixin: mixClass;
                        }

                        /*
                            @rule[0] .entry__a { -st-extends: Base; }
                            @rule[1] .entry__a .extend__mix { -st-extends: Base; id: extend-mix; }
                            @rule[2] .entry__a .extend__mix.base--state { id: extend-mix-state; }
                            @rule[3] .entry__a.base--state { id: extend-root-state; }
                            @rule[4] .entry__a { id: enrich-MixRoot; }
                            @rule[5] .entry__a.base--state { id: enrich-MixRoot-state; }
                        */
                        .a {
                            -st-mixin: MixRoot;
                        }
                    `,
                });

                const { meta } = sheets['/entry.st.css'];

                shouldReportNoDiagnostics(meta);
            });
        });
    });
    describe(`css-pseudo-element`, () => {
        // ToDo: move to css-pseudo-element spec once feature is created
        describe(`st-mixin`, () => {
            it(`should mix local class with pseudo-element`, () => {
                const { sheets } = testStylableCore({
                    '/base.st.css': `
                        .part { prop: a; }
                    `,
                    '/extend.st.css': `
                        @st-import Base from './base.st.css';
                        Base { prop: b; }
                        .part {prop: c; /* override part */}
                    `,
                    '/entry.st.css': `
                        @st-import Extend, [Base] from './extend.st.css';
                    
                        .mix-base {
                            -st-extends: Base;
                            prop: d;
                        }
                        .mix-base::part { prop: e; }

                        /* 
                            @rule(base)[1] .entry__a .base__part { prop: e; } 
                        */
                        .a {
                            -st-mixin: mix-base;
                        }

                        .mix-extend {
                            -st-extends: Extend;
                            prop: f;
                        }
                        .mix-extend::part { prop: g; }

                        /* 
                            @rule(extend)[1] .entry__a .extend__part { prop: g; } 
                        */
                        .a {
                            -st-mixin: mix-extend;
                        }
                    `,
                });

                const { meta } = sheets['/entry.st.css'];

                shouldReportNoDiagnostics(meta);
            });
            it(`should mix imported class with pseudo-element`, () => {
                // ToDo: fix case where extend.st.css has .root between mix rules: https://shorturl.at/cwBMP
                const { sheets } = testStylableCore({
                    '/base.st.css': `
                        .part {
                            /* not going to be mixed through -st-extends */
                            id: base-part;
                        }
                    `,
                    '/extend.st.css': `
                        @st-import Base from './base.st.css';
                        .root {
                            -st-extends: Base;
                        }
                        .part { id: extend-part; }
                        .mix {
                            -st-extends: Base;
                            id: extend-mix;
                        }
                        .mix::part .part {
                            id: extend-mix-part;
                        };
                        .root::part .part{
                            id: extend-root-part;
                        }
                        
                    `,
                    '/enrich.st.css': `
                        @st-import MixRoot, [mix as mixClass] from './extend.st.css';
                        .part { id: enrich-part; }
                        MixRoot {
                            id: enrich-MixRoot;
                        }
                        MixRoot::part .part {
                            id: enrich-MixRoot-part;
                        }
                        .mixClass {
                            id: enrich-mixClass;
                        }
                        .mixClass::part .part {
                            id: enrich-mixClass-part
                        }
                    `,
                    '/entry.st.css': `
                        @st-import [MixRoot, mixClass] from './enrich.st.css';

                        /* 
                            @rule[0] .entry__a { -st-extends: Base; id: extend-mix; } 
                            @rule[1] .entry__a .base__part .extend__part { id: extend-mix-part; } 
                            @rule[2] .entry__a { id: enrich-mixClass; } 
                            @rule[3] .entry__a .base__part .enrich__part { id: enrich-mixClass-part; } 
                        */
                        .a {
                            -st-mixin: mixClass;
                        }

                        /* 
                            @rule[0] .entry__a { -st-extends: Base; } 
                            @rule[1] .entry__a .extend__part { id: extend-part; } 
                            @rule[2] .entry__a .extend__mix { -st-extends: Base; id: extend-mix; } 
                            @rule[3] .entry__a .extend__mix .base__part .extend__part { id: extend-mix-part; } 
                            @rule[4] .entry__a .base__part .extend__part { id: extend-root-part; } 
                            @rule[5] .entry__a { id: enrich-MixRoot; }
                            @rule[6] .entry__a .extend__part .enrich__part { id: enrich-MixRoot-part; }
                        */
                        .a {
                            -st-mixin: MixRoot;
                        }
                    `,
                });

                const { meta } = sheets['/entry.st.css'];

                shouldReportNoDiagnostics(meta);
            });
        });
    });
    describe('native css', () => {
        it('should not namespace', () => {
            const { stylable } = testStylableCore({
                '/native.css': `
                    .name {}
                `,
                '/entry.st.css': `
                    @st-import [name] from './native.css';

                    /* @rule .entry__root .name */
                    .root .name {}
                `,
            });

            const { meta: nativeMeta } = stylable.transform('/native.css');
            const { meta, exports } = stylable.transform('/entry.st.css');

            shouldReportNoDiagnostics(nativeMeta);
            shouldReportNoDiagnostics(meta);

            expect(nativeMeta.targetAst?.toString().trim(), 'no native transform').to.eql(
                '.name {}'
            );

            // symbols
            expect(CSSClass.get(meta, 'name'), 'imported symbol').to.contain({
                _kind: 'class',
                name: 'name',
            });

            // JS exports
            expect(exports.classes, 'JS export').to.eql({
                root: 'entry__root',
                name: 'name',
            });
        });
        it('should not contain default root class', () => {
            testStylableCore({
                '/native.css': ``,
                '/entry.st.css': `
                    /* @transform-error(no root) word(root) ${stImportDiagnostics.UNKNOWN_IMPORTED_SYMBOL(
                        `root`,
                        `./native.css`
                    )} */
                    @st-import [root as nativeRoot] from './native.css';

                    /*
                        @rule .entry__root .entry__nativeRoot
                        @transform-error(unresolved alias) word(nativeRoot) ${classDiagnostics.UNKNOWN_IMPORT_ALIAS(
                            `nativeRoot`
                        )}
                    */
                    .root .nativeRoot {}
                `,
            });
        });
        it('should not have a default export', () => {
            testStylableCore({
                '/native.css': `
                    /* add root to see that it is not taken as default */
                    .root {}
                `,
                '/entry.st.css': `
                    /* @transform-error(no export) word(Native) ${stImportDiagnostics.NO_DEFAULT_EXPORT(
                        `./native.css`
                    )} */
                    @st-import Native from './native.css';

                    /* @rule .entry__root Native */
                    .root Native {}
                `,
            });
        });
        it('should ignore stylable directives', () => {
            const { stylable } = testStylableCore({
                '/native.css': `
                    .a {}
                    .b {
                        -st-extends: a;
                        -st-states: hover;
                        -st-global: ".c";
                    }
                `,
                '/entry.st.css': `
                    @st-import [b] from './native.css';

                    /* @rule .entry__root .b */
                    .root .b {}

                    /* @rule .entry__root .b:hover */
                    .root .b:hover {}
                `,
            });

            shouldReportNoDiagnostics(stylable.transform('/native.css').meta);
            shouldReportNoDiagnostics(stylable.transform('/entry.st.css').meta);
        });
    });
    describe(`stylable (public API)`, () => {
        it(`should transform class name`, () => {
            const { stylable, sheets } = testStylableCore({
                'other.st.css': `
                    .x {}
                    :global(.y) {}
                    .z {
                        -st-global: "[attr=z]";
                    }
                `,
                'entry.st.css': `
                    @st-import [x as ext-x, y as ext-y, z as ext-z] from './other.st.css';
                    .a {}
                    :global(.b) {}
                    .c {
                        -st-global: "[attr=c]";
                    }
                    :vars {
                        not-a-class: red;
                    }
                `,
            });

            const { meta } = sheets['/entry.st.css'];
            const api = stylable.cssClass;

            // ToDo: fix :global(.class) not registering as symbol?

            expect(api.transformIntoSelector(meta, 'a'), 'local class').to.eql('.entry__a');
            // expect(api.transformIntoSelector(meta, 'b'), 'local global class').to.eql('.b');
            expect(api.transformIntoSelector(meta, 'c'), 'local mapped class').to.eql('[attr=c]');
            expect(api.transformIntoSelector(meta, 'unknown'), 'unknown class').to.eql(undefined);
            expect(api.transformIntoSelector(meta, 'not-a-class'), 'not class').to.eql(undefined);
            expect(api.transformIntoSelector(meta, 'ext-x'), 'imported class').to.eql('.other__x');
            // expect(api.transformIntoSelector(meta, 'ext-y'), 'imported global class').to.eql('.y');
            expect(api.transformIntoSelector(meta, 'ext-z'), 'imported mapped class').to.eql(
                '[attr=z]'
            );
        });
        it(`should not modify globals when transforming external selector`, () => {
            const { stylable, sheets } = testStylableCore(`
                .a :global(.a) {}
            `);
            const { meta } = sheets[`/entry.st.css`];

            const { selector } = stylable.transformSelector(meta, `.a :global(.b)`);

            expect(selector, `selector result`).to.eql(`.entry__a .b`);
            expect(meta.globals, `meta globals`).to.eql({
                a: true,
                /*b is not collected*/
            });
        });
    });
});
