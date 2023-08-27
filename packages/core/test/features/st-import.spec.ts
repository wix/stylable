import { STImport, STSymbol } from '@stylable/core/dist/features';
import {
    testStylableCore,
    shouldReportNoDiagnostics,
    diagnosticBankReportToStrings,
} from '@stylable/core-test-kit';
import chai, { expect } from 'chai';
import chaiSubset from 'chai-subset';
chai.use(chaiSubset);

const stImportDiagnostics = diagnosticBankReportToStrings(STImport.diagnostics);
const stSymbolDiagnostics = diagnosticBankReportToStrings(STSymbol.diagnostics);

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
    it('should not add imported symbols to runtime exports', () => {
        const { sheets } = testStylableCore({
            'origin.st.css': `
                .cls {}
            `,
            'entry.st.css': `
                @st-import Root, [cls] from "./origin.st.css"; 
            `,
        });

        const { exports } = sheets['/entry.st.css'];

        expect(Object.keys(exports.classes)).to.not.contain('cls');
    });
    it(`should only be defined at top level`, () => {
        const { sheets } = testStylableCore(`
            .x {
                /* 
                    @transform-remove
                    @analyze-error ${stImportDiagnostics.NO_ST_IMPORT_IN_NESTED_SCOPE()}
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
    it(`should only allow known typed imports`, () => {
        const { sheets: validSheets } = testStylableCore({
            'a.st.css': `
                @keyframes k1;
                @keyframes k2;
                @layer l1;
                @layer l2;
            `,
            'entry.st.css': `@st-import [keyframes(k1, k2), layer(l1, l2)] from "./a.st.css";`,
        });

        shouldReportNoDiagnostics(validSheets['/entry.st.css'].meta);

        testStylableCore({
            'other.st.css': ``,
            'entry.st.css': `
                /* 
                    @analyze-error word(unknown) ${stImportDiagnostics.UNKNOWN_TYPED_IMPORT(
                        'unknown'
                    )}
                    @analyze-error word(classes) ${stImportDiagnostics.UNKNOWN_TYPED_IMPORT(
                        'classes'
                    )}
                */
                @st-import [unknown(u1, u2), classes(c1, c2)] "./a.st.css";
            `,
        });
    });
    it(`should warn on lowercase default import from css file`, () => {
        const { sheets } = testStylableCore(`
            /* @analyze-warn word(sheetError) ${stImportDiagnostics.DEFAULT_IMPORT_IS_LOWER_CASE()} */
            @st-import sheetError from "./a.st.css";

            @st-import SheetStartWithCapital from "./b.st.css";
            @st-import otherModuleDontCare from "./c.js";
        `);

        expect(sheets[`/entry.st.css`].meta.diagnostics.reports.length).to.eql(1);
    });
    it(`should handle invalid cases`, () => {
        testStylableCore(`
            /* @analyze-error(empty from) ${stImportDiagnostics.ST_IMPORT_EMPTY_FROM()} */
            @st-import A from "";

            /* @analyze-error(spaces only from) ${stImportDiagnostics.ST_IMPORT_EMPTY_FROM()} */
            @st-import A from " ";

            /* @analyze-error(* import) ${stImportDiagnostics.ST_IMPORT_STAR()} */
            @st-import * as X from "./some/path";
            
            /* @analyze-error(* import) ${stImportDiagnostics.INVALID_ST_IMPORT_FORMAT([
                `invalid missing source`,
            ])} */
            @st-import %# from ("");
            
            /* @analyze-error(missing from) ${stImportDiagnostics.INVALID_ST_IMPORT_FORMAT([
                `invalid missing from`,
                `invalid missing source`,
            ])} */
            @st-import f rom "x";
            
            /* @analyze-error(invalid mapped custom prop) ${stImportDiagnostics.INVALID_CUSTOM_PROPERTY_AS_VALUE(
                `--x`,
                `z`
            )} */
            @st-import [--x as z] from "./a.st.css"
        `);
    });
    it(`should error on unresolved file`, () => {
        const resolveErrorMessage = `resolve './missing.st.css' in '/'\n  No description file found in / or above\n  No description file found in / or above\n  no extension\n    /missing.st.css doesn't exist\n  .js\n    /missing.st.css.js doesn't exist\n  .json\n    /missing.st.css.json doesn't exist\n  .node\n    /missing.st.css.node doesn't exist\n  as directory\n    /missing.st.css doesn't exist`;
        const resolveErrorMessagePackage = `resolve 'missing-package/index.st.css' in '/'\n  Parsed request is a module\n  No description file found in / or above\n  resolve as module\n    /node_modules doesn't exist or is not a directory`;

        testStylableCore(`
            /* @transform-error(relative) word(./missing.st.css) ${stImportDiagnostics.UNKNOWN_IMPORTED_FILE(
                `./missing.st.css`,
                resolveErrorMessage
            )} */
            @st-import "./missing.st.css";

            /* @transform-error(3rd party) word(missing-package/index.st.css) ${stImportDiagnostics.UNKNOWN_IMPORTED_FILE(
                `missing-package/index.st.css`,
                resolveErrorMessagePackage
            )} */
            @st-import "missing-package/index.st.css";
        `);
    });
    it(`should warn on unknown imported symbol`, () => {
        testStylableCore({
            '/empty.st.css': ``,
            '/entry.st.css': `
                /* @transform-error(named) word(unknown) ${stImportDiagnostics.UNKNOWN_IMPORTED_SYMBOL(
                    `unknown`,
                    `./empty.st.css`
                )} */
                @st-import [unknown] "./empty.st.css";
                
                /* @transform-error(mapped) word(unknown) ${stImportDiagnostics.UNKNOWN_IMPORTED_SYMBOL(
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
                    /* @analyze-warn ${stSymbolDiagnostics.REDECLARE_SYMBOL(`Name`)} */
                    @st-import Name from "./file.st.css";
                    
                    /* @analyze-warn ${stSymbolDiagnostics.REDECLARE_SYMBOL(`Name`)} */
                    @st-import Name from "./file.st.css";
                `,
            });
        });
        it(`should warn on redeclare within a single import symbol`, () => {
            const { sheets } = testStylableCore({
                '/entry.st.css': `
                    /* @analyze-warn ${stSymbolDiagnostics.REDECLARE_SYMBOL(`Name`)} */
                    @st-import Name, [Name] from "./file.st.css"
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            const reports = meta.diagnostics.reports.filter(
                ({ message }) => message === stSymbolDiagnostics.REDECLARE_SYMBOL(`Name`)
            );
            expect(reports.length, `for both default and name`).to.eql(2);
        });
    });
    describe('native css', () => {
        it('should report unsupported native import', () => {
            testStylableCore({
                '/native.css': `
                    @import './something-else.css';
                `,
                '/entry.st.css': `
                    /* @transform-warn ${stImportDiagnostics.UNSUPPORTED_NATIVE_IMPORT()} */
                    @st-import './native.css';
                `,
            });
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
                        @analyze-error ${stImportDiagnostics.NO_PSEUDO_IMPORT_IN_NESTED_SCOPE()}
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
        it(`should only allow known typed imports (keyframes)`, () => {
            const { sheets: validSheets } = testStylableCore({
                'a.st.css': `
                    @keyframes k1;
                    @keyframes k2;
                    @layer l1;
                    @layer l2;
                `,
                'entry.st.css': `
                    :import {
                        -st-from: "./a.st.css";
                        -st-named: keyframes(k1, k2), layer(l1, l2); 
                    }
                `,
            });

            shouldReportNoDiagnostics(validSheets['/entry.st.css'].meta);

            testStylableCore({
                'other.st.css': ``,
                'entry.st.css': `
                    /*
                        @analyze-error word(unknown) ${stImportDiagnostics.UNKNOWN_TYPED_IMPORT(
                            'unknown'
                        )}
                        @analyze-error word(classes) ${stImportDiagnostics.UNKNOWN_TYPED_IMPORT(
                            'classes'
                        )}
                    */
                    :import {
                        -st-from: "./a.st.css";
                        -st-named: unknown(u1, u2), classes(c1, c2); 
                    }
                `,
            });
        });
        it(`should warn on lowercase default import from css file`, () => {
            const { sheets } = testStylableCore(`
                :import{
                    -st-from:"./a.st.css";
                    /* @analyze-warn word(sheetError) ${stImportDiagnostics.DEFAULT_IMPORT_IS_LOWER_CASE()} */
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
                    /* @analyze-error(empty from) ${stImportDiagnostics.EMPTY_IMPORT_FROM()} */
                    -st-from: "";
                    -st-default: Comp;
                }
    
                :import{
                    /* @analyze-error(spaces only from) ${stImportDiagnostics.EMPTY_IMPORT_FROM()} */
                    -st-from: " ";
                    -st-default: Comp;
                }
                
                /* @analyze-error(invalid mapped custom prop) ${stImportDiagnostics.INVALID_CUSTOM_PROPERTY_AS_VALUE(
                    `--x`,
                    `z`
                )} */
                :import {
                    -st-from: "./a.st.css";
                    -st-named: --x as z;
                }

                /* @analyze-error(missing from) ${stImportDiagnostics.FROM_PROP_MISSING_IN_IMPORT()} */
                :import{
                    -st-default: Comp;
                }

                /* @analyze-warn(multiple from) ${stImportDiagnostics.MULTIPLE_FROM_IN_IMPORT()} */
                :import{
                    -st-from: "a";
                    -st-from: "b";
                    -st-default: Comp;
                }

                :import{
                    -st-from:"./imported.st.css";
                    -st-default:Comp;
                    /* @analyze-warn(unknown declaration) word(color) ${stImportDiagnostics.ILLEGAL_PROP_IN_IMPORT(
                        `color`
                    )} */
                    color:red;
                }
            `);
        });
        it(`should error on unresolved file`, () => {
            const resolveErrorMessage = `resolve './missing.st.css' in '/'\n  No description file found in / or above\n  No description file found in / or above\n  no extension\n    /missing.st.css doesn't exist\n  .js\n    /missing.st.css.js doesn't exist\n  .json\n    /missing.st.css.json doesn't exist\n  .node\n    /missing.st.css.node doesn't exist\n  as directory\n    /missing.st.css doesn't exist`;
            const resolveErrorMessagePackage = `resolve 'missing-package/index.st.css' in '/'\n  Parsed request is a module\n  No description file found in / or above\n  resolve as module\n    /node_modules doesn't exist or is not a directory`;

            testStylableCore(`
                :import{
                    /* @transform-error(relative) word(./missing.st.css) ${stImportDiagnostics.UNKNOWN_IMPORTED_FILE(
                        `./missing.st.css`,
                        resolveErrorMessage
                    )} */
                    -st-from: "./missing.st.css";
                }
    
                :import{
                    /* @transform-error(3rd party) word(missing-package/index.st.css) ${stImportDiagnostics.UNKNOWN_IMPORTED_FILE(
                        `missing-package/index.st.css`,
                        resolveErrorMessagePackage
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
                        /* @transform-error(named) word(unknown) ${stImportDiagnostics.UNKNOWN_IMPORTED_SYMBOL(
                            `unknown`,
                            `./empty.st.css`
                        )} */
                        -st-named: unknown;
                    }
                    
                    :import{
                        -st-from: "./empty.st.css";
                        /* @transform-error(mapped) word(unknown) ${stImportDiagnostics.UNKNOWN_IMPORTED_SYMBOL(
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
                    /* @analyze-error ${stImportDiagnostics.FORBIDDEN_DEF_IN_COMPLEX_SELECTOR(
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
                        /* @analyze-warn ${stSymbolDiagnostics.REDECLARE_SYMBOL(`Name`)} */
                        :import {
                            -st-from: './file.st.css';
                            -st-default: Name;
                        }
                        
                        /* @analyze-warn ${stSymbolDiagnostics.REDECLARE_SYMBOL(`Name`)} */
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
                        /* @analyze-warn ${stSymbolDiagnostics.REDECLARE_SYMBOL(`Name`)} */
                        :import {
                            -st-from: './file.st.css';    
                            -st-default: Name;
                            -st-named: Name;
                        }
                    `,
                });

                const { meta } = sheets['/entry.st.css'];

                const reports = meta.diagnostics.reports.filter(
                    ({ message }) => message === stSymbolDiagnostics.REDECLARE_SYMBOL(`Name`)
                );
                expect(reports.length, `for both default and name`).to.eql(2);
            });
        });
    });
    describe('stylable API', () => {
        it('should analyze imports', () => {
            const { stylable, sheets } = testStylableCore({
                '/dir/entry.st.css': `
                    @st-import "./no/imported/symbols";
                    
                    @st-import "../parent-dir";

                    @st-import "/absolute/path";

                    @st-import a from "./default/import";

                    @st-import [b, c as x] from "./named/import";

                    @st-import d, [e] from "./default&named/import";
                    
                    @st-import [f, keyframes(key1, key2 as localKey)] from "./keyframes";
                `,
            });

            const { meta } = sheets['/dir/entry.st.css'];

            const analyzedImports = stylable.stModule.analyze(meta);

            expect(analyzedImports).to.eql([
                {
                    default: '',
                    named: {},
                    from: './no/imported/symbols',
                    typed: { keyframes: {} },
                },
                {
                    default: '',
                    named: {},
                    from: '../parent-dir',
                    typed: { keyframes: {} },
                },
                {
                    default: '',
                    named: {},
                    from: '/absolute/path',
                    typed: { keyframes: {} },
                },
                {
                    default: 'a',
                    named: {},
                    from: './default/import',
                    typed: { keyframes: {} },
                },
                {
                    default: '',
                    named: { b: 'b', x: 'c' },
                    from: './named/import',
                    typed: { keyframes: {} },
                },
                {
                    default: 'd',
                    named: { e: 'e' },
                    from: './default&named/import',
                    typed: { keyframes: {} },
                },
                {
                    default: '',
                    named: { f: 'f' },
                    from: './keyframes',
                    typed: {
                        keyframes: {
                            key1: 'key1',
                            localKey: 'key2',
                        },
                    },
                },
            ]);
        });
    });
});
