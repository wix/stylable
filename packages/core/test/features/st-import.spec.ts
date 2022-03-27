import { STImport, STSymbol } from '@stylable/core/dist/features';
import { testStylableCore, shouldReportNoDiagnostics } from '@stylable/core-test-kit';
import chai, { expect } from 'chai';
import chaiSubset from 'chai-subset';
chai.use(chaiSubset);

describe(`features/st-import`, () => {
    it(`should collect import statements`, () => {
        const { sheets } = testStylableCore(`
            /* @transform-remove */
            @st-import "./no/import";

            /* @transform-remove */
            @st-import a from "./default/import";

            /* @transform-remove */
            @st-import [b, c as x] from "./named/import";

            /* @transform-remove */
            @st-import d, [e] from "./default&named/import";

            /* @transform-remove */
            @st-import abs from "/absolute/path";
        `);

        const { meta } = sheets['/entry.st.css'];

        expect(
            STImport.getImportStatements(meta),
            `STImport.getImportStatements(meta)`
        ).to.containSubset([
            {
                request: `./no/import`,
                defaultExport: ``,
                named: {},
            },
            {
                request: `./default/import`,
                defaultExport: `a`,
                named: {},
            },
            {
                request: `./named/import`,
                defaultExport: ``,
                named: { b: `b`, x: `c` },
            },
            {
                request: `./default&named/import`,
                defaultExport: `d`,
                named: { e: `e` },
            },
            {
                request: `/absolute/path`,
                defaultExport: `abs`,
                named: {},
            },
        ]);
        expect(meta.getImportStatements(), `meta.getImportStatements()`).to.eql(
            STImport.getImportStatements(meta)
        );
    });
    it(`should process imported symbols`, () => {
        const { sheets } = testStylableCore({
            '/some/external/path.st.css': `
                .b {}
                .c {}
            `,
            '/entry.st.css': `
                @st-import A, [b, c as c-local] from "./some/external/path.st.css";
            `,
        });

        const { meta } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        expect(meta.getSymbol(`A`), `default import`).to.contain({
            _kind: `import`,
            type: 'default',
            name: `default`,
        });
        expect(meta.getSymbol(`b`), `named import`).to.contain({
            _kind: `import`,
            type: 'named',
            name: `b`,
        });
        expect(meta.getSymbol(`c-local`), `mapped import`).to.contain({
            _kind: `import`,
            type: 'named',
            name: `c`,
        });
        expect(meta.getSymbol(`c`), `mapped origin`).to.equal(undefined);
    });
    it(`should only be defined at top level`, () => {
        const { sheets } = testStylableCore(`
            .x {
                /* 
                    @transform-remove
                    @analyze-warn ${STImport.diagnostics.NO_ST_IMPORT_IN_NESTED_SCOPE()}
                */
                @st-import D, [n] from "./some/external/path";
            }
        `);

        const { meta } = sheets['/entry.st.css'];

        expect(meta.getImportStatements(), `statement`).to.eql([]);
        expect(meta.getSymbol(`D`), `default import`).to.eql(undefined);
        expect(meta.getSymbol(`n`), `names import`).to.eql(undefined);
    });
    it(`should hoist @st-import`, () => {
        const { sheets } = testStylableCore({
            '/other.st.css': ``,
            '/entry.st.css': `
                /* @rule .entry__root .other__root */
                .root Name {}

                @st-import Name from "./other.st.css";
            `,
        });

        shouldReportNoDiagnostics(sheets[`/entry.st.css`].meta);
    });
    it(`should warn on lowercase default import from css file`, () => {
        const { sheets } = testStylableCore(`
            /* @analyze-warn word(sheetError) ${STImport.diagnostics.DEFAULT_IMPORT_IS_LOWER_CASE()} */
            @st-import sheetError from "./a.st.css";

            @st-import SheetStartWithCapital from "./b.st.css";
            @st-import otherModuleDontCare from "./c.js";
        `);

        expect(sheets[`/entry.st.css`].meta.diagnostics.reports.length).to.eql(1);
    });
    it(`should handle invalid cases`, () => {
        testStylableCore(`
            /* @analyze-error(empty from) ${STImport.diagnostics.ST_IMPORT_EMPTY_FROM()} */
            @st-import A from "";

            /* @analyze-error(spaces only from) ${STImport.diagnostics.ST_IMPORT_EMPTY_FROM()} */
            @st-import A from " ";

            /* @analyze-error(* import) ${STImport.diagnostics.ST_IMPORT_STAR()} */
            @st-import * as X from "./some/path";
            
            /* @analyze-error(* import) ${STImport.diagnostics.INVALID_ST_IMPORT_FORMAT([
                `invalid missing source`,
            ])} */
            @st-import %# from ("");
            
            /* @analyze-error(missing from) ${STImport.diagnostics.INVALID_ST_IMPORT_FORMAT([
                `invalid missing from`,
                `invalid missing source`,
            ])} */
            @st-import f rom "x";
            
            /* @analyze-warn(invalid mapped custom prop) ${STImport.diagnostics.INVALID_CUSTOM_PROPERTY_AS_VALUE(
                `--x`,
                `z`
            )} */
            @st-import [--x as z] from "./a.st.css"
        `);
    });
    it(`should error on unresolved file`, () => {
        testStylableCore(`
            /* @transform-warn(relative) word(./missing.st.css) ${STImport.diagnostics.UNKNOWN_IMPORTED_FILE(
                `./missing.st.css`
            )} */
            @st-import "./missing.st.css";

            /* @transform-warn(3rd party) word(missing-package/index.st.css) ${STImport.diagnostics.UNKNOWN_IMPORTED_FILE(
                `missing-package/index.st.css`
            )} */
            @st-import "missing-package/index.st.css";
        `);
    });
    it(`should warn on unknown imported symbol`, () => {
        testStylableCore({
            '/empty.st.css': ``,
            '/entry.st.css': `
                /* @transform-warn(named) word(unknown) ${STImport.diagnostics.UNKNOWN_IMPORTED_SYMBOL(
                    `unknown`,
                    `./empty.st.css`
                )} */
                @st-import [unknown] "./empty.st.css";
                
                /* @transform-warn(mapped) word(unknown) ${STImport.diagnostics.UNKNOWN_IMPORTED_SYMBOL(
                    `unknown`,
                    `./empty.st.css`
                )} */
                @st-import [unknown as local] "./empty.st.css";
            `,
        });
    });
    describe(`st-symbol`, () => {
        it(`should warn on redeclare between multiple import statements`, () => {
            testStylableCore({
                '/entry.st.css': `
                    /* @analyze-warn ${STSymbol.diagnostics.REDECLARE_SYMBOL(`Name`)} */
                    @st-import Name from "./file.st.css";
                    
                    /* @analyze-warn ${STSymbol.diagnostics.REDECLARE_SYMBOL(`Name`)} */
                    @st-import Name from "./file.st.css";
                `,
            });
        });
        it(`should warn on redeclare within a single import symbol`, () => {
            const { sheets } = testStylableCore({
                '/entry.st.css': `
                    /* @analyze-warn ${STSymbol.diagnostics.REDECLARE_SYMBOL(`Name`)} */
                    @st-import Name, [Name] from "./file.st.css"
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            const reports = meta.diagnostics.reports.filter(
                ({ message }) => message === STSymbol.diagnostics.REDECLARE_SYMBOL(`Name`)
            );
            expect(reports.length, `for both default and name`).to.eql(2);
        });
    });
    describe(`:import (legacy pseudo-import syntax)`, () => {
        it(`should collect import statements`, () => {
            const { sheets } = testStylableCore(`
                /* @transform-remove */
                :import {
                    -st-from: "./no/import";
                }
    
                /* @transform-remove */
                :import {
                    -st-from: "./default/import";
                    -st-default: a;
                }
    
                /* @transform-remove */
                :import {
                    -st-from: "./named/import";
                    -st-named: b, c as x;
                }
    
                /* @transform-remove */
                :import {
                    -st-from: "./default&named/import";
                    -st-default: d;
                    -st-named: e;
                }
    
                /* @transform-remove */
                :import {
                    -st-from: "/absolute/path";
                    -st-default: abs;
                }
            `);

            const { meta } = sheets['/entry.st.css'];

            expect(
                STImport.getImportStatements(meta),
                `STImport.getImportStatements(meta)`
            ).to.containSubset([
                {
                    request: `./no/import`,
                    defaultExport: ``,
                    named: {},
                },
                {
                    request: `./default/import`,
                    defaultExport: `a`,
                    named: {},
                },
                {
                    request: `./named/import`,
                    defaultExport: ``,
                    named: { b: `b`, x: `c` },
                },
                {
                    request: `./default&named/import`,
                    defaultExport: `d`,
                    named: { e: `e` },
                },
                {
                    request: `/absolute/path`,
                    defaultExport: `abs`,
                    named: {},
                },
            ]);
            expect(meta.getImportStatements(), `meta.getImportStatements()`).to.eql(
                STImport.getImportStatements(meta)
            );
        });
        it(`should process imported symbols`, () => {
            const { sheets } = testStylableCore({
                '/some/external/path.st.css': `
                    .b {}
                    .c {}
                `,
                '/entry.st.css': `
                    :import {
                        -st-from: "./some/external/path.st.css";
                        -st-default: A;
                        -st-named: b, c as c-local;
                    }
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            expect(meta.getSymbol(`A`), `default import`).to.contain({
                _kind: `import`,
                type: 'default',
                name: `default`,
            });
            expect(meta.getSymbol(`b`), `named import`).to.contain({
                _kind: `import`,
                type: 'named',
                name: `b`,
            });
            expect(meta.getSymbol(`c-local`), `mapped import`).to.contain({
                _kind: `import`,
                type: 'named',
                name: `c`,
            });
        });
        it(`should only be defined at top level`, () => {
            const { sheets } = testStylableCore(`
                .x {
                    /* 
                        @transform-remove
                        @analyze-warn ${STImport.diagnostics.NO_PSEUDO_IMPORT_IN_NESTED_SCOPE()}
                    */
                    :import {
                        -st-from: "./some/external/path.st.css";
                        -st-default: D;
                        -st-named: n;
                    }
                }
            `);

            const { meta } = sheets['/entry.st.css'];

            expect(meta.getImportStatements(), `statement`).to.eql([]);
            expect(meta.getSymbol(`D`), `default import`).to.eql(undefined);
            expect(meta.getSymbol(`n`), `names import`).to.eql(undefined);
        });
        it(`should hoist :import`, () => {
            const { sheets } = testStylableCore({
                '/other.st.css': ``,
                '/entry.st.css': `
                /* @rule .entry__root .other__root */
                .root Name {}

                :import {
                    -st-from: "./other.st.css";
                    -st-default: Name ;
                }
            `,
            });

            shouldReportNoDiagnostics(sheets[`/entry.st.css`].meta);
        });
        it(`should warn on lowercase default import from css file`, () => {
            const { sheets } = testStylableCore(`
                :import{
                    -st-from:"./a.st.css";
                    /* @analyze-warn word(sheetError) ${STImport.diagnostics.DEFAULT_IMPORT_IS_LOWER_CASE()} */
                    -st-default: sheetError;
                }
    
                :import{
                    -st-from:"./b.st.css";
                    -st-default: SheetStartWithCapital;
                }
                :import{
                    -st-from:"./c.js";
                    -st-default: otherModuleDontCare;
                }
            `);

            expect(sheets[`/entry.st.css`].meta.diagnostics.reports.length).to.eql(1);
        });
        it(`should handle invalid cases`, () => {
            // ToDo: add diagnostic for multiple -st-default
            // ToDo: add diagnostic for multiple -st-named
            testStylableCore(`
                :import{
                    /* @analyze-error(empty from) ${STImport.diagnostics.EMPTY_IMPORT_FROM()} */
                    -st-from: "";
                    -st-default: Comp;
                }
    
                :import{
                    /* @analyze-error(spaces only from) ${STImport.diagnostics.EMPTY_IMPORT_FROM()} */
                    -st-from: " ";
                    -st-default: Comp;
                }
                
                /* @analyze-warn(invalid mapped custom prop) ${STImport.diagnostics.INVALID_CUSTOM_PROPERTY_AS_VALUE(
                    `--x`,
                    `z`
                )} */
                :import {
                    -st-from: "./a.st.css";
                    -st-named: --x as z;
                }

                /* @analyze-error(missing from) ${STImport.diagnostics.FROM_PROP_MISSING_IN_IMPORT()} */
                :import{
                    -st-default: Comp;
                }

                /* @analyze-warn(multiple from) ${STImport.diagnostics.MULTIPLE_FROM_IN_IMPORT()} */
                :import{
                    -st-from: "a";
                    -st-from: "b";
                    -st-default: Comp;
                }

                :import{
                    -st-from:"./imported.st.css";
                    -st-default:Comp;
                    /* @analyze-warn(unknown declaration) word(color) ${STImport.diagnostics.ILLEGAL_PROP_IN_IMPORT(
                        `color`
                    )} */
                    color:red;
                }
            `);
        });
        it(`should error on unresolved file`, () => {
            testStylableCore(`
                :import{
                    /* @transform-warn(relative) word(./missing.st.css) ${STImport.diagnostics.UNKNOWN_IMPORTED_FILE(
                        `./missing.st.css`
                    )} */
                    -st-from: "./missing.st.css";
                }
    
                :import{
                    /* @transform-warn(3rd party) word(missing-package/index.st.css) ${STImport.diagnostics.UNKNOWN_IMPORTED_FILE(
                        `missing-package/index.st.css`
                    )} */
                    -st-from: "missing-package/index.st.css";
                }
            `);
        });
        it(`should warn on unknown imported symbol`, () => {
            testStylableCore({
                '/empty.st.css': ``,
                '/entry.st.css': `
                    :import{
                        -st-from: "./empty.st.css";
                        /* @transform-warn(named) word(unknown) ${STImport.diagnostics.UNKNOWN_IMPORTED_SYMBOL(
                            `unknown`,
                            `./empty.st.css`
                        )} */
                        -st-named: unknown;
                    }
                    
                    :import{
                        -st-from: "./empty.st.css";
                        /* @transform-warn(mapped) word(unknown) ${STImport.diagnostics.UNKNOWN_IMPORTED_SYMBOL(
                            `unknown`,
                            `./empty.st.css`
                        )} */
                        -st-named: unknown as local;
                    }
                `,
            });
        });
        it(`should not allow in complex selector`, () => {
            testStylableCore({
                '/entry.st.css': `
                    /* @analyze-warn ${STImport.diagnostics.FORBIDDEN_DEF_IN_COMPLEX_SELECTOR(
                        `:import`
                    )} */
                    .gaga:import {
                        -st-from: "./file.st.css";
                        -st-default: Comp;
                    }
                `,
            });
        });
        describe(`st-symbol`, () => {
            it(`should warn on redeclare between multiple import statements`, () => {
                testStylableCore({
                    '/entry.st.css': `
                        /* @analyze-warn ${STSymbol.diagnostics.REDECLARE_SYMBOL(`Name`)} */
                        :import {
                            -st-from: './file.st.css';
                            -st-default: Name;
                        }
                        
                        /* @analyze-warn ${STSymbol.diagnostics.REDECLARE_SYMBOL(`Name`)} */
                        :import {
                            -st-from: './file.st.css';
                            -st-default: Name;
                        }
                    `,
                });
            });
            it(`should warn on redeclare within a single import symbol`, () => {
                const { sheets } = testStylableCore({
                    '/entry.st.css': `
                        /* @analyze-warn ${STSymbol.diagnostics.REDECLARE_SYMBOL(`Name`)} */
                        :import {
                            -st-from: './file.st.css';    
                            -st-default: Name;
                            -st-named: Name;
                        }
                    `,
                });

                const { meta } = sheets['/entry.st.css'];

                const reports = meta.diagnostics.reports.filter(
                    ({ message }) => message === STSymbol.diagnostics.REDECLARE_SYMBOL(`Name`)
                );
                expect(reports.length, `for both default and name`).to.eql(2);
            });
        });
    });
});
