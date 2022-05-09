import chaiSubset from 'chai-subset';
import { STSymbol, STVar } from '@stylable/core/dist/features';
import { functionWarnings } from '@stylable/core/dist/functions';
import { stTypes, box } from '@stylable/core/dist/custom-values';
import {
    testStylableCore,
    shouldReportNoDiagnostics,
    diagnosticBankReportToStrings,
} from '@stylable/core-test-kit';
import chai, { expect } from 'chai';
import postcssValueParser from 'postcss-value-parser';

chai.use(chaiSubset);

const stSymbolDiagnostics = diagnosticBankReportToStrings(STSymbol.diagnostics);
const stVarDiagnostics = diagnosticBankReportToStrings(STVar.diagnostics);
const functionsDiagnostics = diagnosticBankReportToStrings(functionWarnings);

describe(`features/st-var`, () => {
    const stBorderDefinitionMock = `
        const { createCustomValue, CustomValueStrategy } = require("@stylable/core");
        exports.stBorder = createCustomValue({
            processArgs: (node, customTypes) => {
                return CustomValueStrategy.args(node, customTypes);
            },
            createValue: ([size, style, color]) => {
                return {
                    size,
                    style,
                    color,
                };
            },
            getValue: (value, index) => {
                return value[index];
            },
            flattenValue: ({ value: { size, style, color } }) => {
                return {
                    delimiter: ' ',
                    parts: [size, style, color],
                };
            },
        })
    `;

    it(`should process :vars definitions`, () => {
        const { sheets } = testStylableCore(`
            /* @transform-remove */
            :vars {
                varA: a-val;
                varB: b-val;
            }
        `);

        const { meta, exports } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        // symbols
        expect(STVar.get(meta, `varA`), `varA symbol`).to.contain({
            _kind: `var`,
            name: `varA`,
            value: ``,
            text: `a-val`,
            valueType: null,
            // node: (meta.rawAst.nodes[1] as any).nodes[0],
        });
        expect(STVar.get(meta, `varB`), `varB symbol`).to.contain({
            _kind: `var`,
            name: `varB`,
            value: ``,
            text: `b-val`,
            valueType: null,
            // node: (meta.rawAst.nodes[1] as any).nodes[1],
        });

        // JS exports
        expect(exports.stVars.varA, `varA JS export`).to.eql(`a-val`);
        expect(exports.stVars.varB, `varB JS export`).to.eql(`b-val`);
    });
    it(`should process multiple :vars definitions`, () => {
        const { sheets } = testStylableCore(`
            /* @transform-remove */
            :vars {
                varA: a-val;
            }
            :vars {
                varB: b-val;
            }
        `);

        const { meta, exports } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        // symbols
        expect(STVar.get(meta, `varA`), `varA symbol`).to.contain({
            _kind: `var`,
            name: `varA`,
            value: ``,
            text: `a-val`,
            valueType: null,
        });
        expect(STVar.get(meta, `varB`), `varB symbol`).to.contain({
            _kind: `var`,
            name: `varB`,
            value: ``,
            text: `b-val`,
            valueType: null,
        });

        // JS exports
        expect(exports.stVars.varA, `varA JS export`).to.eql(`a-val`);
        expect(exports.stVars.varB, `varB JS export`).to.eql(`b-val`);
    });
    it(`should only be defined on root`, () => {
        const { sheets } = testStylableCore(`
            @st-scope {
                /* 
                @analyze-error ${stVarDiagnostics.NO_VARS_DEF_IN_ST_SCOPE()}
                @transform-remove
                */
                :vars {
                    invalid: red;
                }
            }

            /* @analyze-error(complex selector) ${stVarDiagnostics.FORBIDDEN_DEF_IN_COMPLEX_SELECTOR(
                `:vars`
            )} */
            .root:vars {}
        `);

        const { meta, exports } = sheets['/entry.st.css'];

        // symbols
        expect(STVar.get(meta, `invalid`), `symbol not registered`).to.eql(undefined);

        // JS exports
        expect(exports.stVars, `no JS export`).to.eql({});
    });
    it(`should collect @type annotation`, () => {
        const { sheets } = testStylableCore(`
            /* @transform-remove */
            :vars {
                /*@type inline*/a: val;

                /*@type before*/
                b: val;
            }
        `);

        const { meta } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        // symbols
        expect(STVar.get(meta, `a`), `a type`).to.contain({
            valueType: `inline`,
        });
        expect(STVar.get(meta, `b`), `b type`).to.contain({
            valueType: `before`,
        });
    });
    it(`should resolve :vars value using value() function`, () => {
        testStylableCore(`
            /* @transform-remove */
            :vars {
                varA: green;
            }
            .root {
                /* @decl(simple) prop: green */
                prop: value(varA);

                /* @decl(concat) prop: before green-after */
                prop: before value(varA)-after;
                
                /* @decl(in unknown function) prop: unknown(green) */
                prop: unknown(value(varA))
            }
        `);
    });
    it(`should handle invalid value() cases`, () => {
        const { sheets } = testStylableCore(`
            /* @transform-remove */
            :vars {
                varA: green;
            }
            .part {}
            .root {
                /* 
                    @decl(empty) prop: value()
                    @transform-error(empty) ${stVarDiagnostics.MISSING_VAR_IN_VALUE()} 
                */
                prop: value();

                /* 
                    @decl(no first arg) prop: value(, path)
                    @transform-error(no first arg) ${stVarDiagnostics.MISSING_VAR_IN_VALUE()} 
                */
                prop: value(, path);
                
                /* 
                    @decl(unknown var) prop: value(unknown)
                    @transform-error(unknown var) ${stVarDiagnostics.UNKNOWN_VAR('unknown')} 
                */
                prop: value(unknown);

                /* 
                    @decl(non var symbol) prop: value(part)
                    @transform-error(non var symbol) word(part) ${stVarDiagnostics.CANNOT_USE_AS_VALUE(
                        'class',
                        `part`
                    )} 
                */
                prop: value(part);

                /* 
                    @decl(unknown 2nd arg) prop: green
                    @transform-error(unknown 2nd arg) ${stVarDiagnostics.MULTI_ARGS_IN_VALUE(
                        'varA, invalidSecondArgument'
                    )} 
                */
                prop: value(varA, invalidSecondArgument);
            }
        `);
        const { meta } = sheets[`/entry.st.css`];
        // checks reports words that contain parenthesis (inline test cannot)
        expect(
            meta.transformDiagnostics!.reports[0],
            `missing var diagnostic word 1`
        ).to.deep.contain({
            message: stVarDiagnostics.MISSING_VAR_IN_VALUE(),
            word: `value()`,
        });
        expect(
            meta.transformDiagnostics!.reports[1],
            `missing var diagnostic word 2`
        ).to.deep.contain({
            message: stVarDiagnostics.MISSING_VAR_IN_VALUE(),
            word: `value(, path)`,
        });
    });
    it(`should handle escaping`, () => {
        const { sheets } = testStylableCore(`
            :vars {
                color\\.1: green;
            }
        `);

        const { meta, exports } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        // symbols
        expect(STVar.get(meta, `color\\.1`), `symbol`).to.contain({
            name: `color\\.1`,
        });

        // JS exports
        // ToDo: fix bug - this should be 'color.1'
        expect(exports.stVars['color\\.1'], `JS export`).to.eql(`green`);
    });
    it(`should remove outer quotation with content unchanged`, () => {
        const { sheets } = testStylableCore(`                
            :vars {
                double: "double";
                single: 'single';
                quotes: "'with-quotes'";
            }
            .root {
                /* @decl(double) prop: double */
                prop: value(double);

                /* @decl(single) prop: single */
                prop: value(single);
                
                /* @decl(quotes) prop: 'with-quotes' */
                prop: value(quotes);
            }
        `);

        const { meta, exports } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        // symbols
        expect(STVar.get(meta, `double`), `double symbol`).to.contain({
            text: `"double"`,
        });
        expect(STVar.get(meta, `single`), `single symbol`).to.contain({
            text: `'single'`,
        });
        expect(STVar.get(meta, `quotes`), `quotes symbol`).to.contain({
            text: `"'with-quotes'"`,
        });

        // exports
        expect(exports.stVars, `JS exports`).to.eql({
            double: `double`,
            single: `single`,
            quotes: `'with-quotes'`,
        });
    });
    it(`should resolve value in :vars definition`, () => {
        const { sheets } = testStylableCore(`
            /* @transform-remove */
            :vars {
                varA: a-val;
                varB: value(varA);
            }
            .root {
                /* @decl prop: a-val */
                prop: value(varB);
            }
        `);

        const { meta, exports } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        // JS exports
        expect(exports.stVars.varA, `varA JS export`).to.eql(`a-val`);
        expect(exports.stVars.varB, `varB JS export`).to.eql(`a-val`);
    });
    it(`should resolve cyclic vars`, () => {
        const { sheets } = testStylableCore(`                
            :vars {
                /* @transform-error(varA) ${stVarDiagnostics.CYCLIC_VALUE([
                    `/entry.st.css: varB`,
                    `/entry.st.css: varA`,
                    `/entry.st.css: varB`,
                ])} */
                varA: a(value(varB));
                
                /* @transform-error(varB) ${stVarDiagnostics.CYCLIC_VALUE([
                    `/entry.st.css: varA`,
                    `/entry.st.css: varB`,
                    `/entry.st.css: varA`,
                ])} */
                varB: b(value(varA));
            }
            .root {
                /* @decl(varA) prop: a(b(value(varA))) */
                prop: value(varA);
                
                /* @decl(varB) prop: b(a(value(varB))) */
                prop: value(varB);
            }
        `);

        const { meta, exports } = sheets['/entry.st.css'];

        // symbols
        expect(STVar.get(meta, `varA`), `varA symbol`).to.contain({
            text: `a(value(varB))`,
        });
        expect(STVar.get(meta, `varB`), `varB symbol`).to.contain({
            text: `b(value(varA))`,
        });

        // exports
        expect(exports.stVars, `JS exports`).to.eql({
            varA: `a(b(a(value(varB))))`,
            varB: `b(a(b(value(varA))))`,
        });
    });
    describe(`custom-value`, () => {
        it(`should support build-in st-array`, () => {
            const { sheets } = testStylableCore(`
                :vars {
                    shallow: st-array(a, b);

                    str: inline-value;

                    deep: st-array(
                        inline-text,
                        value(str),
                        abc value(str) xyz,
                        st-array(y, z),
                        value(shallow),
                    );
                }
                .root {
                    /* @decl(shallow 1) prop: a */
                    prop: value(shallow, 0);

                    /* @decl(shallow 2) prop: b */
                    prop: value(shallow, 1);

                    /* @decl(deep inline text) prop: inline-text */
                    prop: value(deep, 0);
                    
                    /* @decl(deep inner value) prop: inline-value */
                    prop: value(deep, 1);
                    
                    /* @decl(deep concat) prop: abc inline-value xyz */
                    prop: value(deep, 2);

                    /* @decl(deep inline array) prop: z */
                    prop: value(deep, 3, 1);

                    /* @decl(deep ref array) prop: b */
                    prop: value(deep, 4, 1);
                }
            `);

            const { meta, exports } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            // JS exports
            expect(exports.stVars.shallow, `shallow JS export`).to.eql([`a`, `b`]);
            expect(exports.stVars.deep, `deep JS export`).to.eql([
                `inline-text`,
                `inline-value`,
                `abc inline-value xyz`,
                [`y`, `z`],
                [`a`, `b`],
            ]);
        });
        it(`should support build-in st-map`, () => {
            // ToDo: fix path to nested reference map
            const { sheets } = testStylableCore(`
                :vars {
                    shallow: st-map(
                        a A,
                        b B
                    );

                    str: INLINE-VALUE;

                    deep: st-map(
                        inline-text INLINE-TEXT,
                        inline-value value(str),
                        concat abc value(str) xyz,
                        inline-map st-map(
                            y Y, 
                            z Z
                        ),
                        ref-map value(shallow),
                    );
                }
                .root {
                    /* @decl(shallow 1) prop: A */
                    prop: value(shallow, a);

                    /* @decl(shallow 2) prop: B */
                    prop: value(shallow, b);

                    /* @decl(deep inline text) prop: INLINE-TEXT */
                    prop: value(deep, inline-text);
                    
                    /* @decl(deep inline value) prop: INLINE-VALUE */
                    prop: value(deep, inline-value);
                    
                    /* @decl(deep concat) prop: abc INLINE-VALUE xyz */
                    prop: value(deep, concat);

                    /* @decl(deep inline map) prop: Z */
                    prop: value(deep, inline-map, z);

                    /* @ToDo-decl(deep ref map) prop: B */
                    prop: value(deep, ref-map, b);
                }
            `);

            const { meta, exports } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            // JS exports
            expect(exports.stVars.shallow, `shallow JS export`).to.eql({ a: `A`, b: `B` });
            expect(exports.stVars.deep, `deep JS export`).to.eql({
                'inline-text': `INLINE-TEXT`,
                'inline-value': `INLINE-VALUE`,
                concat: `abc INLINE-VALUE xyz`,
                'inline-map': { y: `Y`, z: `Z` },
                // ToDo: fix
                'ref-map': `st-map(\n                        a A,\n                        b B\n                    )`,
            });
        });
        it(`should support extended custom type`, () => {
            // ToDo: extend tests for full API
            const { sheets } = testStylableCore({
                '/custom.js': `
                    module.exports = {
                        _kind: 'CustomValue',
                        register(id){
                            return {
                                evalVarAst() {},
                                getValue() {
                                    return 'custom value with id="' + id + '"'
                                }
                            }
                        }
                    }
                `,
                '/entry.st.css': `
                    @st-import CustomValue from './custom';

                    :vars {
                        varA: CustomValue();
                    }

                    .root {
                        /* @decl prop: custom value with id="CustomValue" */
                        prop: value(varA);
                    }
                `,
            });

            const { meta, exports } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            // JS exports
            expect(exports.stVars.varA, `JS export`).to.eql(`custom value with id="CustomValue"`);
        });
        it(`should support composed types`, () => {
            const { sheets } = testStylableCore(`
                :vars {
                    deep: st-array(
                        st-map(
                            idx st-array(a, b)
                        )
                    );

                    array-in-map: st-array(
                        st-map(
                            size 1px,
                            style solid,
                            color red
                        ),
                        st-map(
                            size 3px,
                            style dashed,
                            color yellow
                        ),
                        st-map(
                            size 5px,
                            style dotted,
                            color green
                        )
                    );

                    map-in-array: st-map(
                        reds st-array(
                            rgb(100, 0, 0),
                            rgb(255, 0, 0)
                        ),
                        greens st-array(
                            rgb(0, 100, 0),
                            rgb(0, 255, 0)
                        )
                    );
                }
                .root {
                    /* @decl(deep) prop: b */
                    prop: value(deep, 0, idx, 1);
                    
                    /* @decl(array-in-map) prop: 1px solid red */
                    prop: value(array-in-map, 0, size) value(array-in-map, 0, style) value(array-in-map, 0, color);
                    
                    /* @decl(map-in-array) prop: rgb(255, 0, 0) */
                    prop: value(map-in-array, reds, 1);
                }
            `);

            const { meta, exports } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            // JS exports
            expect(exports.stVars, `JS export`).to.eql({
                deep: [
                    {
                        idx: [`a`, `b`],
                    },
                ],
                'array-in-map': [
                    { size: `1px`, style: `solid`, color: `red` },
                    { size: `3px`, style: `dashed`, color: `yellow` },
                    { size: `5px`, style: `dotted`, color: `green` },
                ],
                'map-in-array': {
                    reds: [`rgb(100, 0, 0)`, `rgb(255, 0, 0)`],
                    greens: [`rgb(0, 100, 0)`, `rgb(0, 255, 0)`],
                },
            });
        });
        it(`should resolve value path from resolved value() as key`, () => {
            testStylableCore(`
                :vars {
                    arr-key: 0;
                    map-key: idx;
                    mixed: st-array(
                        st-map(
                            idx deep-value
                        )
                    );
                }
                .root {
                    /* @decl prop: deep-value */
                    prop: value(mixed, value(arr-key), value(map-key));

                    /* 
                    @decl(success despite internal path error) prop: deep-value
                    @transform-error(index un-required path) ${stVarDiagnostics.MULTI_ARGS_IN_VALUE(
                        'arr-key, no-path'
                    )} 
                    @transform-error(key un-required path) ${stVarDiagnostics.MULTI_ARGS_IN_VALUE(
                        'map-key, no-path'
                    )} 
                    */
                    prop: value(mixed, value(arr-key, no-path), value(map-key, no-path));
                }
            `);
        });
        it(`should report on unknown entry`, () => {
            const { sheets } = testStylableCore(`
                :vars {
                    myVar: st-map(
                        key1 red,
                        key2 st-map(
                            key3 green
                        )
                    );
                }
                .root {
                    /* @transform-error(1st level) ${stVarDiagnostics.COULD_NOT_RESOLVE_VALUE(
                        `myVar, unknown`
                    )}*/
                    prop: value(myVar, unknown);

                    /* @transform-error(2nd level) ${stVarDiagnostics.COULD_NOT_RESOLVE_VALUE(
                        `myVar, key2, unknown`
                    )}*/
                    prop: value(myVar, key2, unknown);
                }
            `);

            // check valid multiple arguments to value()
            expect(
                sheets['/entry.st.css'].meta.transformDiagnostics!.reports.length,
                `only access reports`
            ).to.eql(2);
        });
        it(`should report deprecated forms`, () => {
            testStylableCore(`
                :vars {
                    /* @analyze-info(stMap) word(stMap) ${stVarDiagnostics.DEPRECATED_ST_FUNCTION_NAME(
                        `stMap`,
                        `st-map`
                    )}*/
                    varA: stMap(a 1);
                    
                    /* @analyze-info(stArray) word(stArray) ${stVarDiagnostics.DEPRECATED_ST_FUNCTION_NAME(
                        `stArray`,
                        `st-array`
                    )}*/
                    varA: stArray(a, b);
                    
                    /* @analyze-info(nested) word(stMap) ${stVarDiagnostics.DEPRECATED_ST_FUNCTION_NAME(
                        `stMap`,
                        `st-map`
                    )}*/
                    varA: stArray(
                        a,
                        stMap(a 1)
                    );
                }
            `);
        });
        it.skip('should report on invalid input', () => {
            /**
             * TODO: test invalid input in built-in custom values (st-map, st-array)
             */
            testStylableCore(`
                :vars {
                    /* @transform-error ${
                        stVarDiagnostics.COULD_NOT_RESOLVE_VALUE(
                            `keyWithoutValue`
                        ) /** TODO - add custom diagnostic for this case */
                    }*/
                    keyWithoutValueMap: stMap(keyWithoutValue);
                }
            `);
        });
        it(`*** st-map and st-array contract test ***`, () => {
            const test = ({
                label,
                typeDef,
                path,
                expectedMatch,
                expectedDataStructure,
                deepIncludeTest = false,
            }: {
                label: string;
                typeDef: string;
                path: string[];
                expectedMatch: string;
                expectedDataStructure: any;
                deepIncludeTest?: boolean;
            }) => {
                const valueAst = postcssValueParser(typeDef).nodes[0];
                const typeExtension = stTypes[valueAst.value];
                const dataStructure = typeExtension.evalVarAst(valueAst, stTypes).value;
                const match = typeExtension.getValue(
                    path,
                    typeExtension.evalVarAst(valueAst, stTypes),
                    valueAst,
                    stTypes
                );
                const dataStructureExpect = expect(dataStructure, `${label} data structure`);
                deepIncludeTest
                    ? dataStructureExpect.to.deep.include(expectedDataStructure)
                    : dataStructureExpect.to.eql(expectedDataStructure);
                expect(match, `${label} string value from path`).to.equal(expectedMatch);
            };

            test({
                label: `st-map flat access`,
                typeDef: `st-map(k1 v1, k2 v2)`,
                path: [`k1`],
                expectedMatch: `v1`,
                expectedDataStructure: { k1: `v1`, k2: `v2` },
            });
            test({
                label: `st-map nested access`,
                typeDef: `st-map(k1 v1, k2 st-map(k3 v3, k4 st-map(k5 v5) ))`,
                path: [`k2`, `k4`, `k5`],
                expectedMatch: `v5`,
                deepIncludeTest: true,
                expectedDataStructure: {
                    k1: `v1`,
                    k2: box(`st-map`, {
                        k3: `v3`,
                        k4: box(`st-map`, {
                            k5: `v5`,
                        }),
                    }),
                },
            });
            test({
                label: `st-array flat access`,
                typeDef: `st-array(v0, v1)`,
                path: [`1`],
                expectedMatch: `v1`,
                expectedDataStructure: [`v0`, `v1`],
            });
            test({
                label: `st-array nested access`,
                typeDef: `st-array(v0, st-array(v1))`,
                path: [`1`, `0`],
                expectedMatch: `v1`,
                expectedDataStructure: [`v0`, box(`st-array`, [`v1`])],
            });
            test({
                label: `composed array/map/array access`,
                typeDef: `st-array(v0, st-map(k2 st-array(v2))`,
                path: [`1`, `k2`, `0`],
                expectedMatch: `v2`,
                expectedDataStructure: [`v0`, box(`st-map`, { k2: box(`st-array`, [`v2`]) })],
            });
            test({
                label: `composed map/array/map access`,
                typeDef: `st-map(k0 v0, k1 st-array(v2, st-map(k3 v3)))`,
                path: [`k1`, `1`, `k3`],
                expectedMatch: `v3`,
                expectedDataStructure: {
                    k0: `v0`,
                    k1: box(`st-array`, [`v2`, box(`st-map`, { k3: `v3` })]),
                },
            });
        });
    });
    describe(`st-import`, () => {
        it(`should resolve imported var`, () => {
            const { sheets } = testStylableCore({
                '/vars.st.css': `
                    :vars {
                        before: before-val;
                        after: after-val;
                    }
                `,
                '/entry.st.css': `
                    :vars {
                        localBefore: value(before);
                    }
                    .root {
                        /* @decl(before) prop: before-val */
                        prop: value(before);

                        /* @decl(localBefore) prop: before-val */
                        prop: value(localBefore);
                    }
                
                    @st-import [before, after] from './vars.st.css';

                    :vars {
                        localAfter: value(after);
                    }
                    .root {
                        /* @decl(after) prop: after-val */
                        prop: value(after);

                        /* @decl(localAfter) prop: after-val */
                        prop: value(localAfter);
                    }
                `,
            });

            const { meta, exports } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            // symbols
            expect(STVar.get(meta, `before`), `import symbol not linked locally`).to.eql(undefined);
            expect(STVar.get(meta, `localBefore`), `local symbol`).to.contain({
                name: `localBefore`,
                value: ``,
                text: `value(before)`,
            });

            // exports
            expect(exports.stVars, `JS export not contains imported`).to.eql({
                localBefore: `before-val`,
                localAfter: `after-val`,
            });
        });
        it(`should resolve imported Javascript strings`, () => {
            const { sheets } = testStylableCore({
                '/code.js': `
                    module.exports = {
                        jsStr: '123',
                    };
                `,
                '/re-export.st.css': `
                    @st-import [jsStr as mappedJsStr] from './code';
                `,
                '/entry.st.css': `                
                    @st-import [jsStr] from './code';
                    @st-import [mappedJsStr as reexportJsStr] from './re-export.st.css';

                    :vars {
                        a: value(jsStr);
                        b: value(reexportJsStr);
                    }

                    .root {
                        /* @decl(direct) prop: 123 */
                        prop: value(jsStr);
                        
                        /* @decl(re-export) prop: 123 */
                        prop: value(reexportJsStr);
                    }
                `,
            });

            const { meta, exports } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            // JS exports
            expect(exports.stVars.a, `a JS export`).to.eql(`123`);
            expect(exports.stVars.b, `a re-exported JS export`).to.eql(`123`);
        });
        it(`should report unhandled imported non var symbols in value`, () => {
            testStylableCore({
                '/vars.st.css': `
                    .imported-class {}
                `,
                '/code.js': `
                    module.exports = {
                        jsNum: 123,
                        jsFunc: function abc() {}
                    };
                `,
                '/entry.st.css': `                
                    @st-import Sheet, [imported-class, unknown] from './vars.st.css';
                    @st-import [jsNum, jsFunc] from './code';

                    .root {
                        /* 
                            @decl(imported sheet) prop: value(Sheet)
                            @transform-error(imported sheet) word(Sheet) ${stVarDiagnostics.CANNOT_USE_AS_VALUE(
                                `stylesheet`,
                                `Sheet`
                            )} 
                        */
                        prop: value(Sheet);
                        
                        /* 
                            @decl(imported-class) prop: value(imported-class)
                            @transform-error(imported-class) word(imported-class) ${stVarDiagnostics.CANNOT_USE_AS_VALUE(
                                `class`,
                                `imported-class`
                            )} 
                        */
                        prop: value(imported-class);

                        /* 
                            @decl(unknown) prop: value(unknown)
                            @transform-error(unknown) word(unknown) ${stVarDiagnostics.UNKNOWN_VAR(
                                `unknown`
                            )} 
                        */
                        prop: value(unknown);

                        /* 
                            @decl(JS number) prop: value(jsNum)
                            @transform-error(JS number) word(jsNum) ${stVarDiagnostics.CANNOT_USE_JS_AS_VALUE(
                                `number`,
                                `jsNum`
                            )} 
                        */
                        prop: value(jsNum);
                        
                        /* 
                            @decl(JS function) prop: value(jsFunc)
                            @transform-error(JS function) word(jsFunc) ${stVarDiagnostics.CANNOT_USE_JS_AS_VALUE(
                                `function`,
                                `jsFunc`
                            )} 
                        */
                        prop: value(jsFunc);
                    }
                `,
            });
        });
        it(`should override imported with local definition`, () => {
            const { sheets } = testStylableCore({
                '/vars.st.css': `
                    :vars {
                        before: imported-before-val;
                        after: imported-after-val;
                    }
                `,
                '/entry.st.css': `
                    :vars {
                        /* @analyze-warn(local before) word(before) ${stSymbolDiagnostics.REDECLARE_SYMBOL(
                            `before`
                        )} */
                        before: local-before-val;
                    }
                    .root {
                        /* @decl(before) prop: local-before-val */
                        prop: value(before);
                    }

                    /*
                    @analyze-warn(import before) word(before) ${stSymbolDiagnostics.REDECLARE_SYMBOL(
                        `before`
                    )}
                    @analyze-warn(import after) word(after) ${stSymbolDiagnostics.REDECLARE_SYMBOL(
                        `after`
                    )}
                    */
                    @st-import [before, after] from './vars.st.css';

                    :vars {
                        /* @analyze-warn(local after) word(after) ${stSymbolDiagnostics.REDECLARE_SYMBOL(
                            `after`
                        )} */
                        after: local-after-val;
                    }
                    .root {
                        /* @decl(after) prop: local-after-val */
                        prop: value(after);
                    }
                `,
            });
            const { exports } = sheets['/entry.st.css'];

            // exports
            expect(exports.stVars, `JS export`).to.eql({
                after: `local-after-val`,
                before: `local-before-val`,
            });
        });
        it(`should resolve deep imported var`, () => {
            const { sheets } = testStylableCore({
                '/deep.st.css': `
                    :vars {
                        str: str-val;
                        map: st-map(
                            a st-map(
                                b deep-map-val
                            )
                        );
                        arr: st-array(
                            red, green
                        );
                    }
                `,
                '/mid.st.css': `
                    @st-import [str, map, arr] from './deep.st.css';
                `,
                '/entry.st.css': `             
                    @st-import [str, map, arr] from './mid.st.css';

                    .root {
                        /* @decl(str) prop: str-val */
                        prop: value(str);

                        /* @decl(map) prop: deep-map-val */
                        prop: value(map, a, b);
                        
                        /* @decl(array) prop: green */
                        prop: value(arr, 1);
                    }
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it(`should resolve cyclic vars between stylesheets`, () => {
            const { sheets } = testStylableCore({
                '/a.st.css': `
                    @st-import [varB] from './b.st.css';
                    :vars {
                        /* @transform-error(varA) ${stVarDiagnostics.CYCLIC_VALUE([
                            `/a.st.css: varB`,
                            `/b.st.css: varA`,
                            `/a.st.css: varB`,
                        ])} */
                        varA: a(value(varB));
                    }
                    .root {
                        /* @decl(varB in a) prop: b(a(value(varB))) */
                        prop: value(varB);

                        /* @decl(varA in a) prop: a(b(a(value(varB)))) */
                        prop: value(varA);
                    }
                `,
                '/b.st.css': `
                    @st-import [varA] from './a.st.css';
                    :vars {
                        /* @transform-error(varB) ${stVarDiagnostics.CYCLIC_VALUE([
                            `/b.st.css: varA`,
                            `/a.st.css: varB`,
                            `/b.st.css: varA`,
                        ])} */
                        varB: b(value(varA));
                    }
                    .root {
                        /* @decl(varA in b) prop: a(b(value(varA))) */
                        prop: value(varA);

                        /* @decl(varB in b) prop: b(a(b(value(varA)))) */
                        prop: value(varB);
                    }
                `,
            });

            const aExports = sheets['/a.st.css'].exports;
            const bExports = sheets['/b.st.css'].exports;

            // exports
            expect(aExports.stVars.varA, `varA JS export`).to.eql(`a(b(a(value(varB))))`);
            expect(bExports.stVars.varB, `varB JS export`).to.eql(`b(a(b(value(varA))))`);
        });
    });
    describe(`st-formatter`, () => {
        it(`should accept formatter in declaration`, () => {
            const { sheets } = testStylableCore({
                '/formatter.js': `
                    module.exports = function add(a, b) {
                        return Number(a) + Number(b);
                    }
                `,
                '/entry.st.css': `                
                    @st-import add from './formatter.js';

                    :vars {
                        amount: add(1, 2);
                    }
                    .root {
                        /* @decl prop: 3 */
                        prop: value(amount);
                    }
                `,
            });

            const { meta, exports } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            // symbols
            expect(STVar.get(meta, `amount`), `symbol`).to.contain({
                text: `add(1, 2)`,
            });

            // exports
            expect(exports.stVars, `JS export`).to.eql({
                amount: `3`,
            });
        });
        it(`should resolve imported var with formatter in declaration`, () => {
            testStylableCore({
                '/formatter.js': `
                    module.exports = function getYellowAndBlue() {
                        return 'green';
                    }
                `,
                '/vars.st.css': `
                    @st-import getYellowAndBlue from './formatter.js';

                    :vars {
                        color: getYellowAndBlue();
                    }
                `,
                '/entry.st.css': `                
                    @st-import [color] from './vars.st.css';

                    .root {
                        /* @decl background: green */
                        background: value(color);
                    }
                `,
            });
        });
        it(`should handle error`, () => {
            const { sheets } = testStylableCore({
                '/formatter.js': `
                    module.exports = function fail() {
                        throw new Error("FAIL!");
                    }
                `,
                '/entry.st.css': `                
                    @st-import fail from './formatter.js';

                    :vars {
                        definition: fail(input);
                        color: red;
                    }
                    .root {
                        /* @decl(definition) prop: fail(input) */
                        prop: value(definition);

                        /* @decl(value) prop: fail(a, red, z) */
                        prop: fail(a, value(color), z);
                    }
                `,
            });

            const { meta, exports } = sheets['/entry.st.css'];

            // symbols
            expect(STVar.get(meta, `definition`), `definition symbol`).to.contain({
                text: `fail(input)`,
            });

            // exports
            expect(exports.stVars.definition, `definition JS export`).to.eql(`fail(input)`);
        });
    });
    describe(`css-media`, () => {
        it(`should resolve value() function`, () => {
            const { sheets } = testStylableCore(`
                :vars {
                    mobile-width: 200px;
                }

                /* @atrule screen (200px) */
                @media screen (value(mobile-width)) {}
            `);

            const { meta } = sheets[`/entry.st.css`];

            shouldReportNoDiagnostics(meta);
        });
    });
    describe(`hooks.replaceValueHook`, () => {
        it(`should override value() result"`, () => {
            let valueCallCount = 0;
            const { sheets } = testStylableCore(
                `
                :vars {
                    a: "red";
                    b: green;
                }
                .container {
                    /* @decl prop: override(0) red-a-true */
                    prop: value(a);
                    
                    /* @decl prop: override(1) green-b-true */
                    prop: value(b);
                }
            `,
                {
                    stylableConfig: {
                        hooks: {
                            replaceValueHook(resolved, name, isLocal) {
                                return `override(${valueCallCount++}) ${resolved}-${name}-${isLocal}`;
                            },
                        },
                    },
                }
            );

            const { meta, exports } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            // JS exports
            expect(exports.stVars.a, `a JS export`).to.eql(`red`);
            expect(exports.stVars.b, `b JS export`).to.eql(`green`);
        });
        it(`should override value() from JS import"`, () => {
            // ToDo: move to CSSValue feature when it will be created
            testStylableCore(
                {
                    '/functions.js': `
                        module.exports.fn1 = function(x){return 'fn1'}
                        module.exports.fn2 = function(x){return 'fn2'}
                    `,
                    '/entry.st.css': `
                        @st-import [fn1, fn2] from './functions';

                        .root {
                            /* @decl prop: hooked_fn1(hooked_fn2(input)) */
                            prop: fn1(fn2(input));
                        }
                    `,
                },
                {
                    stylableConfig: {
                        hooks: {
                            replaceValueHook(_resolved, fn) {
                                if (typeof fn !== 'string') {
                                    return `hooked_${fn.name}(${fn.args})`;
                                }
                                return '';
                            },
                        },
                    },
                }
            );
        });
        it(`should override value() passed to mixin"`, () => {
            testStylableCore(
                {
                    '/deep.st.css': `
                        :vars {
                            deepVar: green;
                        }
                        .part {
                            deepProp: value(deepVar);
                        }
                    `,
                    '/mix.st.css': `
                        @st-import Deep from './deep.st.css';

                        :vars {
                            a: original-a;
                            b: original-b;
                            c: original-c;
                        }
                        .level-1 {
                            a: value(a);
                            b: value(b);
                            c: value(c);
                        }
                        .level-2 {
                            -st-mixin: Deep(deepVar value(c));
                        }
                    `,
                    '/entry.st.css': `
                        @st-import Mix from './mix.st.css';

                        :vars {
                            topA: 1;
                            topB: 2;
                        }
                        /*
                            @rule[1] .entry__root .mix__level-1 {
                                a: 1,topA,true,;
                                b: 2,topB,true,;
                                c: original-c,c,true,default from /entry.st.css;
                            }
                            @rule[3] .entry__root .mix__level-2 .deep__part {
                                deepProp: original-c,c,true,default from /entry.st.css;
                            }
                        */
                        .root {
                            -st-mixin: Mix(a value(topA), b value(topB));
                        }
                    `,
                },
                {
                    stylableConfig: {
                        hooks: {
                            replaceValueHook(resolved, name, isLocal, path) {
                                return [resolved, name, isLocal, path].join(`,`);
                            },
                        },
                    },
                }
            );
        });
    });
    describe('introspection', () => {
        describe('getComputed', () => {
            it('should get computed st-vars', () => {
                const { stylable, sheets } = testStylableCore(`
                :vars {
                    a: red;
                    b: blue;
                    c: st-array(value(a), gold);
                }
                `);

                const { meta } = sheets['/entry.st.css'];
                const computedVars = stylable.stVar.getComputed(meta);

                expect(Object.keys(computedVars)).to.eql(['a', 'b', 'c']);
                expect(computedVars.a).to.containSubset({
                    value: 'red',
                    input: {
                        flatValue: 'red',
                        type: 'st-string',
                        value: 'red',
                    },
                    diagnostics: { reports: [] },
                });
                expect(computedVars.b).to.containSubset({
                    value: 'blue',
                    input: {
                        flatValue: 'blue',
                        type: 'st-string',
                        value: 'blue',
                    },
                    diagnostics: { reports: [] },
                });
                expect(computedVars.c).to.containSubset({
                    value: ['red', 'gold'],
                    input: {
                        type: 'st-array',
                        value: [
                            {
                                flatValue: 'red',
                                type: 'st-string',
                                value: 'red',
                            },
                            {
                                flatValue: 'gold',
                                type: 'st-string',
                                value: 'gold',
                            },
                        ],
                    },
                    diagnostics: { reports: [] },
                });
            });

            it('should get deep computed complex st-vars', () => {
                const { stylable, sheets } = testStylableCore(`
                :vars {
                    map: st-map(a st-map(b red));
                }
                `);

                const { meta } = sheets['/entry.st.css'];
                const computedVars = stylable.stVar.getComputed(meta);

                expect(Object.keys(computedVars)).to.eql(['map']);
                expect(computedVars.map.diagnostics.reports.length).to.eql(0);
                expect(computedVars.map.value).to.eql({
                    a: {
                        b: 'red',
                    },
                });
                expect(computedVars.map.input).to.eql({
                    type: 'st-map',
                    flatValue: undefined,
                    value: {
                        a: {
                            type: 'st-map',
                            flatValue: undefined,
                            value: {
                                b: {
                                    flatValue: 'red',
                                    type: 'st-string',
                                    value: 'red',
                                },
                            },
                        },
                    },
                });
            });

            it('should get computed custom value st-var', () => {
                const { stylable, sheets } = testStylableCore({
                    '/entry.st.css': `
                    @st-import [stBorder as createBorder] from './st-border.js';
    
                    :vars {
                        border: createBorder(1px, solid, red);
                    }
                    `,
                    // Stylable custom value
                    '/st-border.js': stBorderDefinitionMock,
                });

                const { meta } = sheets['/entry.st.css'];
                const computedVars = stylable.stVar.getComputed(meta);

                expect(Object.keys(computedVars)).to.eql(['border']);
                expect(computedVars.border).to.containSubset({
                    value: '1px solid red',
                    input: {
                        type: 'createBorder',
                        flatValue: '1px solid red',
                        value: {
                            color: 'red',
                            size: '1px',
                            style: 'solid',
                        },
                    },
                    diagnostics: { reports: [] },
                });
            });

            it('should get deep computed custom value st-var', () => {
                const { stylable, sheets } = testStylableCore({
                    '/entry.st.css': `
                    @st-import [stBorder] from './st-border.js';
    
                    :vars {
                        array: st-array(blue, stBorder(1px, solid, blue));
                        map: st-map(
                                border stBorder(
                                    value(array, 1, size), 
                                    solid, 
                                    value(array, 0)
                                )
                            );
                    }
                    `,
                    // Stylable custom value
                    '/st-border.js': stBorderDefinitionMock,
                });

                const { meta } = sheets['/entry.st.css'];
                const computedVars = stylable.stVar.getComputed(meta);

                expect(Object.keys(computedVars)).to.eql(['array', 'map']);
                expect(computedVars.array).to.containSubset({
                    value: ['blue', '1px solid blue'],
                    input: {
                        type: 'st-array',
                        flatValue: undefined,
                        value: [
                            {
                                flatValue: 'blue',
                                type: 'st-string',
                                value: 'blue',
                            },
                            {
                                type: 'stBorder',
                                flatValue: '1px solid blue',
                                value: {
                                    color: 'blue',
                                    size: '1px',
                                    style: 'solid',
                                },
                            },
                        ],
                    },
                    diagnostics: { reports: [] },
                });
                expect(computedVars.map).to.containSubset({
                    value: {
                        border: '1px solid blue',
                    },
                    input: {
                        type: 'st-map',
                        flatValue: undefined,
                        value: {
                            border: {
                                type: 'stBorder',
                                flatValue: '1px solid blue',
                                value: {
                                    color: 'blue',
                                    size: '1px',
                                    style: 'solid',
                                },
                            },
                        },
                    },
                    diagnostics: { reports: [] },
                });
            });

            it('should get imported computed st-vars', () => {
                const { stylable, sheets } = testStylableCore({
                    '/entry.st.css': `
                    @st-import [imported-var as imported] from './imported.st.css';
    
                    :vars {
                        a: value(imported);
                        b: st-map(a value(imported));
                    }
                    `,
                    'imported.st.css': `
                    :vars {
                        imported-var: red;
                    }
                    `,
                });

                const { meta } = sheets['/entry.st.css'];
                const computedVars = stylable.stVar.getComputed(meta);

                expect(Object.keys(computedVars)).to.eql(['imported', 'a', 'b']);
                expect(computedVars.imported).to.containSubset({
                    value: 'red',
                    input: {
                        flatValue: 'red',
                        type: 'st-string',
                        value: 'red',
                    },
                    diagnostics: { reports: [] },
                });
                expect(computedVars.a).to.containSubset({
                    value: 'red',
                    input: {
                        flatValue: 'red',
                        type: 'st-string',
                        value: 'red',
                    },
                    diagnostics: { reports: [] },
                });
                expect(computedVars.b).to.containSubset({
                    value: { a: 'red' },
                    input: {
                        type: 'st-map',
                        value: {
                            a: 'red',
                        },
                    },
                    diagnostics: { reports: [] },
                });
            });

            it('should emit diagnostics only on invalid computed st-vars', () => {
                const { stylable, sheets } = testStylableCore(
                    `
                    :vars {
                        validBefore: red;
                        invalid: invalid-func(imported);
                        validAfter: green;
                    }
                    `
                );

                const { meta } = sheets['/entry.st.css'];

                const computedVars = stylable.stVar.getComputed(meta);

                expect(Object.keys(computedVars)).to.eql(['validBefore', 'invalid', 'validAfter']);
                expect(computedVars.validBefore).to.containSubset({
                    value: 'red',
                    input: {
                        flatValue: 'red',
                        type: 'st-string',
                        value: 'red',
                    },
                    diagnostics: { reports: [] },
                });
                expect(computedVars.validAfter).to.containSubset({
                    value: 'green',
                    input: {
                        flatValue: 'green',
                        type: 'st-string',
                        value: 'green',
                    },
                    diagnostics: { reports: [] },
                });
                expect(computedVars.invalid).to.containSubset({
                    value: 'invalid-func(imported)',
                    input: {
                        flatValue: 'invalid-func(imported)',
                        type: 'st-string',
                        value: 'invalid-func(imported)',
                    },
                    diagnostics: {
                        reports: [
                            {
                                message: functionsDiagnostics.UNKNOWN_FORMATTER('invalid-func'),
                                severity: 'error',
                            },
                        ],
                    },
                });
            });

            it('should emit diagnostics only on invalid custom st-vars', () => {
                const { stylable, sheets } = testStylableCore({
                    '/entry.st.css': `
                        @st-import [stBorder] from './st-border.js';
    
                        :vars {
                            border: stBorder(st-array(1px, 2px), solid, red);
                        }
                    `,
                    // Stylable custom value
                    '/st-border.js': stBorderDefinitionMock,
                });

                const { meta } = sheets['/entry.st.css'];

                const computedVars = stylable.stVar.getComputed(meta);

                expect(computedVars.border).to.containSubset({
                    value: '',
                    input: {
                        flatValue: '',
                        type: 'st-string',
                        value: '',
                    },
                    diagnostics: {
                        reports: [
                            {
                                message: stVarDiagnostics.COULD_NOT_RESOLVE_VALUE(),
                                severity: 'error',
                            },
                        ],
                    },
                });
            });
        });

        describe('flatten', () => {
            it('should flat simple st vars', () => {
                const { stylable, sheets } = testStylableCore(`
                    :vars {
                        a: red;
                        b: blue;
                    }
                `);

                const meta = sheets['/entry.st.css'].meta;
                const flattenStVars = stylable.stVar.flatten(meta);

                expect(flattenStVars).to.eql([
                    {
                        value: 'red',
                        path: ['a'],
                    },
                    {
                        value: 'blue',
                        path: ['b'],
                    },
                ]);
            });
            it('should not flat native css function inside st vars', () => {
                const { stylable, sheets } = testStylableCore(`
                    :vars {
                        a: linear-gradient(to right, red, blue);
                    }
                `);

                const meta = sheets['/entry.st.css'].meta;
                const flattenStVars = stylable.stVar.flatten(meta);

                expect(flattenStVars).to.eql([
                    {
                        path: ['a'],
                        value: 'linear-gradient(to right, red, blue)',
                    },
                ]);
            });
            it('should flat imported simple st vars', () => {
                const { stylable, sheets } = testStylableCore({
                    '/entry.st.css': `
                        @st-import [color as myColor] from './imported.st.css';
                        .root { color: value(myColor); }
                    `,
                    '/imported.st.css': `
                        :vars {
                            color: red;
                        }
                    `,
                });

                const meta = sheets['/entry.st.css'].meta;
                const flattenStVars = stylable.stVar.flatten(meta);

                expect(flattenStVars).to.eql([
                    {
                        value: 'red',
                        path: ['myColor'],
                    },
                ]);
            });

            it('should flat st-array st vars', () => {
                const { stylable, sheets } = testStylableCore(
                    `
                    :vars {
                        array: st-array(1px, 2px);
                    }

                    `
                );

                const meta = sheets['/entry.st.css'].meta;
                const flattenStVars = stylable.stVar.flatten(meta);

                expect(flattenStVars).to.eql([
                    {
                        value: '1px',
                        path: ['array', '0'],
                    },
                    {
                        value: '2px',
                        path: ['array', '1'],
                    },
                ]);
            });

            it('should flat st-map st vars', () => {
                const { stylable, sheets } = testStylableCore(
                    `
                    :vars {
                        map: st-map(first 1px,second 2px);
                    }

                    `
                );

                const meta = sheets['/entry.st.css'].meta;
                const flattenStVars = stylable.stVar.flatten(meta);

                expect(flattenStVars).to.eql([
                    {
                        value: '1px',
                        path: ['map', 'first'],
                    },
                    {
                        value: '2px',
                        path: ['map', 'second'],
                    },
                ]);
            });

            it('should flat custom value st vars', () => {
                const { stylable, sheets } = testStylableCore({
                    '/entry.st.css': `
                        @st-import [stBorder] from './st-border.js';

                        :vars {
                            border: stBorder(1px, solid, red);
                        }
                    `,
                    '/st-border.js': stBorderDefinitionMock,
                });

                const meta = sheets['/entry.st.css'].meta;
                const flattenStVars = stylable.stVar.flatten(meta);

                expect(flattenStVars).to.eql([
                    {
                        value: '1px solid red',
                        path: ['border'],
                    },
                    {
                        value: '1px',
                        path: ['border', 'size'],
                    },
                    {
                        value: 'solid',
                        path: ['border', 'style'],
                    },
                    {
                        value: 'red',
                        path: ['border', 'color'],
                    },
                ]);
            });
            it('should flat nested st-array st vars', () => {
                const { stylable, sheets } = testStylableCore(
                    `
                    :vars {
                        nestedArray: st-array(
                            red,
                            st-array(red, green),
                            st-map(color1 gold, color2 blue),
                        );
                    }

                    `
                );

                const meta = sheets['/entry.st.css'].meta;
                const flattenStVars = stylable.stVar.flatten(meta);

                expect(flattenStVars).to.eql([
                    {
                        value: 'red',
                        path: ['nestedArray', '0'],
                    },
                    {
                        value: 'red',
                        path: ['nestedArray', '1', '0'],
                    },
                    {
                        value: 'green',
                        path: ['nestedArray', '1', '1'],
                    },
                    {
                        value: 'gold',
                        path: ['nestedArray', '2', 'color1'],
                    },
                    {
                        value: 'blue',
                        path: ['nestedArray', '2', 'color2'],
                    },
                ]);
            });
            it('should flat nested st-map st vars', () => {
                const { stylable, sheets } = testStylableCore(
                    `
                    :vars {
                        nestedMap: st-map(
                            simple red,
                            array st-array(red, green),
                            map st-map(color1 gold, color2 blue)
                        );
                    }

                    `
                );

                const meta = sheets['/entry.st.css'].meta;
                const flattenStVars = stylable.stVar.flatten(meta);

                expect(flattenStVars).to.eql([
                    {
                        value: 'red',
                        path: ['nestedMap', 'simple'],
                    },
                    {
                        value: 'red',
                        path: ['nestedMap', 'array', '0'],
                    },
                    {
                        value: 'green',
                        path: ['nestedMap', 'array', '1'],
                    },
                    {
                        value: 'gold',
                        path: ['nestedMap', 'map', 'color1'],
                    },
                    {
                        value: 'blue',
                        path: ['nestedMap', 'map', 'color2'],
                    },
                ]);
            });
        });
    });
});
