import chaiSubset from 'chai-subset';
import { Diagnostics } from '@stylable/core';
import { STMixin } from '@stylable/core/dist/features';
import {
    testStylableCore,
    shouldReportNoDiagnostics,
    matchRuleAndDeclaration,
    diagnosticBankReportToStrings,
} from '@stylable/core-test-kit';
import chai, { expect } from 'chai';
import type * as postcss from 'postcss';

const mixinDiagnostics = diagnosticBankReportToStrings(STMixin.diagnostics);

chai.use(chaiSubset);
describe(`features/st-mixin`, () => {
    it(`should append mixin declarations`, () => {
        const { sheets } = testStylableCore(`
            .mix {
                propA: blue;
                propB: green;
            }

            /* @rule .entry__empty {propA: blue; propB: green;} */
            .empty {
                -st-mixin: mix;
            }

            /* @rule .entry__insert {before:1; propA:blue; propB:green; after: 2} */
            .insert {
                before: 1;
                -st-mixin: mix;
                after: 2;
            }
        `);

        const { meta } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);
    });
    it(`should append mixin rules`, () => {
        const { sheets } = testStylableCore(`
            .mix {
                id: mix;
            }
            .mix:hover {
                id: mix-hover;;
            }
            .mix .child {
                id: mix-child;
            }
            :is(.mix) {
                id: is-mix;
            }
            .y:not(.mix) {
                id: class-not-mix;
            }


            /* 
            @rule[0] .entry__root { id: mix } 
            @rule[1] .entry__root:hover { id: mix-hover } 
            @rule[2] .entry__root .entry__child { id: mix-child }  
            @rule[3] :is(.entry__root) { id: is-mix }  
            @rule[4] .entry__y:not(.entry__root) { id: class-not-mix }  
            */
            .root {
                -st-mixin: mix;
            }
        `);

        const { meta } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);
    });
    it('should reorder selector to context', () => {
        const { sheets } = testStylableCore({
            '/mixin.st.css': `
                .root {
                    -st-states: x;
                }
                .mixin {-st-states: mix-state;}
                .root:x.mixin:mix-state {
                    z-index: 1;
                }
                .root:x.mixin:mix-state[attr].y {
                    z-index: 1;
                }
                .mixin:is(.y.mixin:mix-state) {
                    z-index: 1;
                }
                .x.mixin[a] .y.mixin[b] {
                    z-index: 1;
                } 
                :is(.x.mixin:is(.y.mixin)) {
                    z-index: 1;
                }

            `,
            'entry.st.css': `
                @st-import [mixin] from "./mixin.st.css";

                /* 
                    @rule[1] .entry__y.mixin--mix-state.mixin__root.mixin--x  
                    @rule[2] .entry__y.mixin--mix-state[attr].mixin__y.mixin__root.mixin--x    
                    @rule[3] .entry__y:is(.entry__y.mixin--mix-state.mixin__y)
                    @rule[4] .entry__y[a].mixin__x .entry__y[b].mixin__y
                    @rule[5] :is(.entry__y:is(.entry__y.mixin__y).mixin__x)
                */
                .y {
                    -st-mixin: mixin;
                }
            `,
        });
        shouldReportNoDiagnostics(sheets[`/entry.st.css`].meta);
    });
    it(`should append mixin within a mixin`, () => {
        const { sheets } = testStylableCore(`
            .deep-mix {
                prop: green;
            }
            .top-mix {
                -st-mixin: deep-mix;
            }

            /* @rule .entry__a {prop: green;} */
            .a {
                -st-mixin: top-mix;
            }
        `);

        const { meta } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);
    });
    it(`should handle circular mixins`, () => {
        testStylableCore(`
            /* 
            @transform-error(a) ${mixinDiagnostics.CIRCULAR_MIXIN([
                `b from /entry.st.css`,
                `a from /entry.st.css`,
            ])} 
            @rule .entry__a {
                prop: green;
                prop: green;
            } 
            */
            .a {
                prop: green;
                -st-mixin: b;
            }

            /* 
            @transform-error(a) ${mixinDiagnostics.CIRCULAR_MIXIN([
                `a from /entry.st.css`,
                `b from /entry.st.css`,
            ])} 
            @rule .entry__b {
                prop: green;
            } 
            */
            .b {
                -st-mixin: a;
            }
        `);
    });
    it(`should append mixin with complex selector`, () => {
        const { sheets } = testStylableCore(`
            .mix {}
            .mix .mix.other {
                prop: b;
            }
            .mix:hover, .filter-out-unrelated, .mix:focus {
                prop: c;
            }

            /* 
                @rule(mix repeat)[1] .entry__a .entry__a.entry__other {prop: b;} 
                @rule(multi selector)[2] .entry__a:hover, .entry__a:focus {prop: c;} 
            */
            .a {
                -st-mixin: mix;
            }
        `);

        const { meta } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);
    });
    it(`should append mixin to complex selector`, () => {
        const { sheets } = testStylableCore({
            '/ns.st.css': `
                .mix {
                    prop: a;
                }
                .mix .mix.other {
                    prop: b;
                }
                .mix:hover, .filter-out-unrelated, .mix:focus {
                    prop: c;
                }

                /* 
                    @rule(only mixin class)[0] .ns__a .ns__b {prop: a;} 
                    @rule(mix repeat)[1] .ns__a .ns__b .ns__a .ns__b.ns__other {prop: b;} 
                    @rule(multi selector)[2] .ns__a .ns__b:hover, .ns__a .ns__b:focus {prop: c;} 
                */
                .a .b {
                    -st-mixin: mix;
                }
            `,
        });

        const { meta } = sheets['/ns.st.css'];

        shouldReportNoDiagnostics(meta);
    });
    it(`should report unknown args`, () => {
        testStylableCore(`
            :vars {
                a: red;
                point_to_a: value(a);
            }
            .mix {
                color: value(point_to_a);
            }

            /* @rule .entry__root { color: green } */
            .root {
                /* @transform-warn word(unknown) ${mixinDiagnostics.UNKNOWN_ARG('unknown')} */
                -st-mixin: mix(
                    a green, 
                    unknown red
                );
            }
        `);
    });
    it(`should handle invalid cases`, () => {
        testStylableCore(`
            .mixA {
                color: red;
            }
            .mixB {
                color: green;
            }

            /* @rule .entry__root { } */
            .root {
                /* @transform-error ${mixinDiagnostics.VALUE_CANNOT_BE_STRING()} */
                -st-mixin: "mixA";
            }

            /* @rule .entry__root { color: green } */
            .root {
                -st-mixin: mixA;
                /* @transform-warn ${mixinDiagnostics.OVERRIDE_MIXIN(`-st-mixin`)} */
                -st-mixin: mixB;
            }

            :vars {
                colorX: red;
            }
            /* @rule .entry__root { } */
            .root {
                /* @transform-error ${mixinDiagnostics.UNSUPPORTED_MIXIN_SYMBOL(`colorX`, 'var')} */
                -st-mixin: colorX;
            }
            
            @property --customPropX;
            /* @rule .entry__root { } */
            .root {
                /* @transform-error ${mixinDiagnostics.UNSUPPORTED_MIXIN_SYMBOL(
                    `--customPropX`,
                    'cssVar'
                )} */
                -st-mixin: --customPropX;
            }
        `);
    });
    it(`should not mix mixin that is removed before transform`, () => {
        testStylableCore(
            `
            .mix {
                id: mix;
            }

            /* 
                @rule .entry__mixToClass { before: a; after: z; }
            */
            .mixToClass {
                before: a;
                -st-mixin: mix;
                after: z;

            }
        `,
            {
                stylableConfig: {
                    onProcess(meta) {
                        // remove -st-mixin origin before apply mixin.
                        const mixToClass = meta.sourceAst.nodes[2] as postcss.Rule;
                        const stMixinDecl = mixToClass.nodes[1];
                        stMixinDecl.remove();
                        return meta;
                    },
                },
            }
        );
    });
    describe(`st-import`, () => {
        it(`should mix imported class`, () => {
            const { sheets } = testStylableCore({
                '/imported.st.css': `
                    .mix {
                        prop: green;
                    }
                    .mix .local {
                        prop: blue;
                    }
                `,
                '/entry.st.css': `
                    @st-import [mix] from './imported.st.css';
                    /* 
                        @rule .entry__a { prop: green; } 
                        @rule[1] .entry__a .imported__local { prop: blue; } 
                    */
                    .a {
                        -st-mixin: mix;
                    }
                `,
            });
            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it(`should mix imported mapped class into class with same local name`, () => {
            const { sheets } = testStylableCore({
                '/imported.st.css': `
                    .mix {
                        prop: green;
                    }
                    .mix .local {
                        prop: blue;
                    }
                `,
                '/entry.st.css': `
                    @st-import [mix as mappedMix] from './imported.st.css';
                    /* 
                        @rule .entry__mix { prop: green; } 
                        @rule[1] .entry__mix .imported__local { prop: blue; } 
                    */
                    .mix {
                        -st-mixin: mappedMix;
                    }
                `,
            });
            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it(`should mix aliased CSS overrides`, () => {
            const { sheets } = testStylableCore({
                '/base.st.css': `
                    .mix {
                        prop: a;
                    }
                    .mix:hover .local {
                        prop: b;
                    }
                `,
                '/enriched.st.css': `
                    @st-import [mix] from './base.st.css';
                    .mix {
                        prop: c;
                    }
                    .mix:hover .local {
                        prop: d;
                    }
                `,
                '/entry.st.css': `
                    @st-import [mix] from './enriched.st.css';

                    .mix:hover.local {
                        prop: e;
                    }

                    /* 
                        @rule[0] .entry__a { prop: a; } 
                        @rule[1] .entry__a:hover .base__local { prop: b; } 
                        @rule[2] .entry__a { prop: c; } 
                        @rule[3] .entry__a:hover .enriched__local { prop: d; } 
                        @rule[4] .entry__a:hover.entry__local { prop: e; } 
                    */
                    .a {
                        -st-mixin: mix;
                    }
                `,
            });
            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it(`should mix nested mixins`, () => {
            const { sheets } = testStylableCore({
                '/base.st.css': `
                    .c {}
                `,
                '/enriched.st.css': `
                    @st-import Base from './base.st.css';
                    .b {
                        -st-mixin: Base;
                    }
                `,
                '/entry.st.css': `
                    @st-import Enriched from './enriched.st.css';
                    /* 
                        @rule[0] .entry__a
                        @rule[1] .entry__a .enriched__b
                        @rule[2] .entry__a .enriched__b .base__c
                    */
                    .a {
                        -st-mixin: Enriched;
                    }
                `,
            });
            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it(`should report unknown args (from another sheet)`, () => {
            const { sheets } = testStylableCore({
                '/vars.st.css': `
                    :vars {
                        a: red;
                        point_to_a: value(a);
                    }
                `,
                '/entry.st.css': `
                    @st-import [point_to_a] from './vars.st.css';
                    .mix {
                        color: value(point_to_a);
                    }
    
                    /* @rule .entry__root { color: green } */
                    .root {
                        /* @transform-warn word(unknown) ${mixinDiagnostics.UNKNOWN_ARG(
                            'unknown'
                        )} */
                        -st-mixin: mix(
                            a green, 
                            unknown red
                        );
                    }
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            expect(meta.transformDiagnostics?.reports.length).to.eql(1);
        });
        it(`should handle circular mixins from multiple stylesheets`, () => {
            // ToDo: check why circular_mixin is not reported
            testStylableCore({
                '/sheet1.st.css': `
                    @st-import [b] from './sheet2.st.css';
                    /* 
                    @xtransform-warn(a) ${mixinDiagnostics.CIRCULAR_MIXIN([
                        `b from /sheet2.st.css`,
                        `a from /sheet1.st.css`,
                    ])} 
                    @rule .sheet1__a {
                        prop: green;
                        prop: green;
                    } 
                    */
                    .a {
                        prop: green;
                        -st-mixin: b;
                    }
                `,
                '/sheet2.st.css': `
                    @st-import [a] from './sheet1.st.css';
                    /* 
                    @xtransform-warn(a) ${mixinDiagnostics.CIRCULAR_MIXIN([
                        `a from /sheet1.st.css`,
                        `b from /sheet2.st.css`,
                    ])} 
                    @rule .sheet2__b {
                        prop: green;
                    } 
                    */
                    .b {
                        -st-mixin: a;
                    }
                `,
            });
        });
        it(`should handle unresolved mixin`, () => {
            testStylableCore({
                '/mixin.st.css': ``,
                '/entry.st.css': `
                    @st-import [unresolved] from './mixin.st.css';

                    .a {
                        /* @transform-error ${mixinDiagnostics.UNKNOWN_MIXIN(`unknown`)} */
                        -st-mixin: unknown;
                    }

                    .a {
                        /* @transform-error ${mixinDiagnostics.UNKNOWN_MIXIN(`unresolved`)} */
                        -st-mixin: unresolved;
                    }
                `,
            });
        });
    });
    describe(`root mixin`, () => {
        it(`should mix all content`, () => {
            const { sheets } = testStylableCore({
                '/mix.st.css': `
                    .a {
                        origin: a;
                    }
                    .b {
                        origin: b;
                    }
                `,
                '/entry.st.css': `
                    @st-import Mix from './mix.st.css';
                    /* 
                    @rule(.a)[1] .entry__into .mix__a {origin: a;} 
                    @rule(.b)[2] .entry__into .mix__b {origin: b;} 
                    */
                    .into {
                        -st-mixin: Mix;
                    }
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it(`should report on circular mixin when mixed on local class`, () => {
            testStylableCore(`
                /* 
                @transform-error ${mixinDiagnostics.CIRCULAR_MIXIN([`root from /entry.st.css`])}
                @rule(self)[0] .entry__a {} 
                @rule(self appended)[1] .entry__a .entry__a {}
                @rule(other appended)[2] .entry__a .entry__b {}
                @rule(other original)[3] .entry__b {}
                */
                .a {
                    -st-mixin: root;
                }

                .b {}
            `);
        });
        it.skip(`should mix root class (bug)`, () => {
            // ToDo:fix .root mixed order bug (should be between .a and .b)
            // ToDo:fix .root mixed specificity bug (should be .entry__root .entry__root?)
            const { sheets } = testStylableCore(`
                .a {
                    origin: a;
                }
                .root {
                    origin: root;
                }
                .b {
                    origin: b;
                }

                /* 
                @rule(.a)[1] .entry__into .entry__a {origin: a;} 
                @rule(.root)[2] .entry__into .entry__root {origin: root;} 
                @rule(.b)[3] .entry__into .entry__b {origin: b;} 
                */
                .into {
                    -st-mixin: root;
                }
            `);

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
    });
    describe(`-st-partial-mixin`, () => {
        it(`should append only declaration that includes the overridden params`, () => {
            const { sheets } = testStylableCore(`
                :vars {
                    v1: red;
                    v2: green;
                    v3: blue;
                }

                .mix {
                    propA: value(v1), value(v2);
                    propB: value(v1), value(v3);
                }

                /* @rule(just v2) .entry__a {
                    propA: red, white
                }*/
                .a {
                    -st-partial-mixin: mix(v2 white);
                }

                /* @rule(just v3) .entry__a {
                    propB: red, white
                }*/
                .a {
                    -st-partial-mixin: mix(v3 white);
                }

                /* @rule(v2 & v3) .entry__a {
                    propA: red, purple;
                    propB: red, white;
                }*/
                .a {
                    -st-partial-mixin: mix(v2 purple, v3 white);
                }

                /* @rule(just v1) .entry__a {
                    propA: white, green;
                    propB: white, blue;
                }*/
                .a {
                    -st-partial-mixin: mix(v1 white);
                }
            `);

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it(`should append only rules that contains included declarations`, () => {
            const { sheets } = testStylableCore(`
                :vars {
                    v1: red;
                    v2: green;
                    v3: blue;
                }

                /* 
                    @rule(origin - v1)[0] .entry__mix { propA: red }
                    @rule(origin - v2)[1] .entry__mix:hover { propB: green }
                    @rule(origin - v3)[2] .entry__mix:focus { propC: blue }
                */
                .mix {
                    propA: value(v1);
                }
                .mix:hover {
                    propB: value(v2);
                }
                .mix:focus {
                    propC: value(v3);
                }

                /* 
                    @rule(v1 - override)[0] .entry__a { propA: white; }
                    @rule(v1- end-of-mix)[1] .entry__SEP { }
                */
                .a {
                    -st-partial-mixin: mix(v1 white);
                }
                .SEP {}

                /* 
                    @rule(v2 - empty)[0] .entry__a { }
                    @rule(v2 - override)[1] .entry__a:hover { propB: white }
                    @rule(v2- end-of-mix)[2] .entry__SEP { }
                */
                .a {
                    -st-partial-mixin: mix(v2 white);
                }
                .SEP {}

                /* 
                    @rule(v3 - empty)[0] .entry__a { }
                    @rule(v3 - override)[1] .entry__a:focus { propC: white }
                    @rule(v3- end-of-mix)[2] .entry__SEP { }
                */
                .a {
                    -st-partial-mixin: mix(v3 white);
                }
                .SEP {}

                /* 
                    @rule(v2&v3 - empty)[0] .entry__a { }
                    @rule(v2&v3 - override)[1] .entry__a:hover { propB: yellow }
                    @rule(v2&v3 - override)[2] .entry__a:focus { propC: white }
                    @rule(v2&v3- end-of-mix)[3] .entry__SEP { }
                */
                .a {
                    -st-partial-mixin: mix(v2 yellow, v3 white);
                }
                .SEP {}
            `);

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it(`should append nested partial mixins`, () => {
            const { sheets } = testStylableCore(`
                :vars {
                    v1: red;
                    v2: green;
                    v3: blue;
                }
                
                .mix-deep {
                    propA: value(v1);
                    propB: value(v2);
                }
                .mix {
                    -st-partial-mixin: mix-deep(v2 value(v1));
                    propX: value(v2);
                }

                /* 
                    @rule(v1) .entry__a { propB: white; }
                    @rule(v1-end)[1] .entry__SEP
                */
                .a {
                    -st-partial-mixin: mix(v1 white);
                }
                .SEP {}

                /* 
                    @rule(v2) .entry__a { propX: white }
                    @rule(v2-end)[1] .entry__SEP
                */
                .a {
                    -st-partial-mixin: mix(v2 white);
                }
                .SEP {}
            `);

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it(`should resolve variable value from overrides`, () => {
            const { sheets } = testStylableCore(`
                :vars {
                    v1: red;
                    v2: v2 -> value(v1);
                    v3: v3 -> value(v2);
                }
                
                .mix {
                    /* @decl prop: v3 -> v2 -> red */
                    prop: value(v3);
                }

                /* 
                    @rule(v1) .entry__a { prop: v3 -> v2 -> green; }
                */
                .a {
                    -st-partial-mixin: mix(v1 green);
                }

                /* 
                    @rule(v2) .entry__a { prop: v3 -> green; }
                */
                .a {
                    -st-partial-mixin: mix(v2 green);
                }
            `);

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it(`should warn for no params`, () => {
            testStylableCore(`
                :vars {
                    v1: red;
                }
                
                .mix-color {
                    color: value(v1);
                }

                /*  @rule(v1) .entry__a { } */
                .a {
                    /* @transform-error word(mix-color) ${mixinDiagnostics.PARTIAL_MIXIN_MISSING_ARGUMENTS(
                        `mix-color`
                    )} */
                    -st-partial-mixin: mix-color();
                }
            `);
        });
        it(`should be applied next to -st-mixin`, () => {
            testStylableCore(`
                :vars {
                    color: red;
                    size: 1px;
                }
                
                .mix {
                    background: value(color);
                    width: value(size);
                }

                /*  @rule(partial after) .entry__a {
                    pos: before;
                    background: red;
                    width: 1px;
                    pos: between;
                    background: green;
                    pos: after;
                } */
                .a {
                    pos: before;
                    -st-mixin: mix;
                    pos: between;
                    -st-partial-mixin: mix(color green);
                    pos: after;
                }
                
                /*  @rule(partial before) .entry__a {
                    pos: before;
                    background: green;
                    pos: between;
                    background: red;
                    width: 1px;
                    pos: after;
                } */
                .a {
                    pos: before;
                    -st-partial-mixin: mix(color green);
                    pos: between;
                    -st-mixin: mix;
                    pos: after;
                }
            `);
        });
    });
    describe(`JavaScript mixin`, () => {
        it(`should append mixin declarations`, () => {
            const { sheets } = testStylableCore({
                '/mixin.js': `
                    module.exports = {
                        addGreen() {
                            return {
                                color: "green"
                            }
                        },
                        fallbackDecl() {
                            return {
                                color: ["blue", "green"]
                            }
                        },
                        camelToKebab() {
                            return {
                                declPropName: "declValue"
                            }
                        },
                        notAStringDecl() {
                            return {
                                number: 56,
                                'obj-as-fallback': [
                                    'before', 
                                    {toString(){return "stringified decl val"}}, 
                                    'after'
                                ],
                            }
                        }
                    }
                `,
                '/entry.st.css': `
                    @st-import [addGreen, fallbackDecl, camelToKebab, notAStringDecl] from './mixin.js';
        
                    /* @rule(single) .entry__root {
                        before: val;
                        color: green;
                        after: val;
                    } */
                    .root {
                        before: val;
                        -st-mixin: addGreen;
                        after: val;
                    }

                    /* @rule(fallback) .entry__root {
                        before: val;
                        color: blue;
                        color: green;
                        after: val;
                    } */
                    .root {
                        before: val;
                        -st-mixin: fallbackDecl;
                        after: val;
                    }

                    /* @rule(fallback) .entry__root {
                        decl-prop-name: declValue;
                    } */
                    .root {
                        -st-mixin: camelToKebab;
                    }

                    /* @rule .entry__root { 
                        number: 56px;
                        obj-as-fallback: before;
                        obj-as-fallback: stringified decl val;
                        obj-as-fallback: after;
                    } */
                    .root {
                        -st-mixin: notAStringDecl;
                    }
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it(`should append mixin rules`, () => {
            // ToDo: fix ":global(.part)" to transform with mixin root
            const { sheets } = testStylableCore({
                '/mixin.js': `
                    module.exports = function() {
                        return {
                            Element: {
                                d: "Capital element"
                            },
                            element: {
                                d: "lowercase element"
                            },
                            ".part": {
                                d: "class namespaced in context"
                            },
                            ":global(.part)": {
                                d: "global class"
                            },
                            ".x, .y": {
                                d: "multiple selectors"
                            }
                        }
                    }
                `,
                '/entry.st.css': `
                    @st-import multiRules from './mixin.js';
        
                    /* 
                        @rule[0] .entry__root {} 
                        @rule[1] .entry__root Element { d: Capital element } 
                        @rule[2] .entry__root element { d: lowercase element } 
                        @rule[3] .entry__root .entry__part { d: class namespaced in context } 
                        @rule[4] .part { d: global class } 
                        @rule[5] .entry__root .entry__x, .entry__root .entry__y { d: multiple selectors } 
                    */
                    .root {
                        -st-mixin: multiRules;
                    }
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it(`should append mixin on multiple selectors`, () => {
            const { sheets } = testStylableCore({
                '/mixin.js': `
                    module.exports = function() {
                        return {
                            prop: "x",
                            div: {
                                prop: "y"
                            },
                        }
                    }
                `,
                '/entry.st.css': `
                    @st-import multiRules from './mixin.js';
        
                    /* 
                        @rule[0] .entry__a, .entry__b { prop: x } 
                        @rule[1] .entry__a div, .entry__b div { prop: y } 
                    */
                    .a, .b {
                        -st-mixin: multiRules;
                    }
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it(`should append nested mixin`, () => {
            const { sheets } = testStylableCore({
                '/mixin.js': `
                    module.exports = function() {
                        return {
                            prop: "1",
                            "&:hover": {
                                prop: "2"
                            },
                            ".child": {
                                prop: "3",
                                "&:focus": {
                                    prop: "4"
                                }
                            }
                        }
                    }
                `,
                '/entry.st.css': `
                    @st-import nestedRules from './mixin.js';
        
                    /* 
                        @rule[0] .entry__root { prop: 1 } 
                        @rule[1] .entry__root:hover { prop: 2 } 
                        @rule[2] .entry__root .entry__child { prop: 3 } 
                        @rule[3] .entry__root .entry__child:focus { prop: 4 } 
                    */
                    .root {
                        -st-mixin: nestedRules;
                    }
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it(`should accept list of values (as first argument)`, () => {
            const { sheets } = testStylableCore({
                '/mixin.js': `
                    module.exports = function(params) {
                        return {
                            color: params[0],
                            background: params[1],
                        }
                    }
                `,
                '/entry.st.css': `
                    @st-import paint from './mixin.js';
        
                    /* @rule(inline) .entry__root {
                        color: black;
                        background: white;
                    } */
                    .root {
                        -st-mixin: paint(black, white);
                    }

                    :vars {
                        color1: white;
                        color2: green;
                    }
                    /* @rule(values) .entry__root {
                        color: white;
                        background: green;
                    } */
                    .root {
                        -st-mixin: paint(value(color1), value(color2));
                    }
                    
                    /* @rule(strings) .entry__root {
                        color: orange;
                        background: gold;
                    } */
                    .root {
                        -st-mixin: paint("orange", "gold");
                    }
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it(`should handle no values`, () => {
            const { sheets } = testStylableCore({
                '/mixin.js': `
                    module.exports = function(params) {
                        return {
                            param1: params[0] || 'default',
                            param2: params[1] || 'default',
                        }
                    }
                `,
                '/entry.st.css': `
                    @st-import twoParams from './mixin.js';
        
                    /* @rule(no parans) .entry__no-parenthesis {
                        param1: default;
                        param2: default;
                    } */
                    .no-parenthesis {
                        -st-mixin: twoParams;
                    }

                    /* @rule(empty parans) .entry__no-args {
                        param1: default;
                        param2: default;
                    } */
                    .no-args {
                        /* - report: report useless diagnostics "argument at index 0 is empty" */
                        -st-mixin: twoParams(); 
                    }

                    /* @rule(only first) .entry__partial {
                        param1: v1;
                        param2: default;
                    } */
                    .partial {
                        -st-mixin: twoParams("v1"); 
                    }
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it(`should append multiple mixins`, () => {
            const { sheets } = testStylableCore({
                '/mixin.js': `
                    module.exports = function(params) {
                        return {
                            [params[0]]: params[1]
                        }
                    }
                `,
                '/entry.st.css': `
                    @st-import decl from './mixin.js';
        
                    /* 
                        @rule[0] .entry__root {
                            color: green;
                            background: blue;
                        } 
                    */
                    .root {
                        -st-mixin: decl(color, green) decl(background, blue);
                    }
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it(`should re-export JS mixin`, () => {
            const { sheets } = testStylableCore({
                '/mixin.js': `
                    module.exports = function() {
                        return {
                            color: "green"
                        }
                    }
                `,
                '/pass-through.st.css': `
                    @st-import addGreen from './mixin.js';
                `,
                '/entry.st.css': `
                    @st-import [addGreen] from './pass-through.st.css';
        
                    /* @rule .entry__root {
                        color: green;
                    } */
                    .root {
                        -st-mixin: addGreen;
                    }
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it(`should handle invalid cases`, () => {
            testStylableCore({
                '/mixins.js': `
                    module.exports = {
                        notAFunction: "not a function",
                        throw() {
                            throw "bug in js mix";
                        }
                    };
                `,
                '/entry.st.css': `
                    @st-import [notAFunction, throw] from './mixins.js';

                    .a {
                        /* @transform-error(not a function) word(notAFunction) ${mixinDiagnostics.JS_MIXIN_NOT_A_FUNC()} */
                        -st-mixin: notAFunction;
                    }

                    /* @transform-error(mix throw) word(throw) ${mixinDiagnostics.FAILED_TO_APPLY_MIXIN(
                        `bug in js mix`
                    )} */
                    .a {
                        -st-mixin: throw;
                    }
                `,
            });
        });
        it(`should apply on -st-partial-mixin (same as -st-mixin)`, () => {
            const { sheets } = testStylableCore({
                '/mixin.js': `
                    module.exports = {
                        addColor(params) {
                            return {
                                color: params || 'red'
                            }
                        },
                    }
                `,
                '/entry.st.css': `
                    @st-import [addColor] from './mixin.js';
        
                    /* @rule(single) .entry__root {
                        before: val;
                        color: green;
                        after: val;
                    } */
                    .root {
                        before: val;
                        -st-partial-mixin: addColor(green);
                        after: val;
                    }
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
    });
    describe(`st-global`, () => {
        it(`should keep global selectors from mixin`, () => {
            const { sheets } = testStylableCore({
                '/mix.st.css': `
                    .mixA .before :global(.a) .after {}
                    .mixB .before :global(.b) .after {}
                `,
                '/entry.st.css': `
                    @st-import [mixA, mixB] from './mix.st.css';

                    /* @rule(direct)[1] .entry__root .mix__before .a .mix__after */
                    .root {
                        -st-mixin: mixA;
                    }

                    .local-mix {
                        -st-mixin: mixB;
                    }

                    /* @rule(nested)[1] .entry__root .mix__before .b .mix__after */
                    .root {
                        -st-mixin: local-mix;
                    }
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            expect(meta.globals, 'globals reflected out').to.eql({
                a: true,
                b: true,
            });
        });
    });
    describe(`st-formatter`, () => {
        it(`should resolve formatter value in mixin `, () => {
            const { sheets } = testStylableCore({
                '/connect-args.js': `
                    module.exports = function() {
                        return \`\${[...arguments].join(', ')}\`;
                    }
                `,
                '/entry.st.css': `
                    @st-import connectArgs from './connect-args';
                    :vars {
                        shallow: connectArgs(defaultA, defaultB);
                        deep: value(shallow);
                    }
                    .mix {
                        prop: connectArgs(color1, color2);
                    }
                    .mix-with-param {
                        propA: value(shallow);
                        propB: value(deep);
                    }
        
                    /* @rule(no params) 
                    .entry__a {
                        prop: color1, color2;
                    } */
                    .a {
                        -st-mixin: mix;
                    }

                    /* @rule(default param) 
                    .entry__a {
                        propA: defaultA, defaultB; 
                        propB: defaultA, defaultB;
                    } */
                    .a {
                        -st-mixin: mix-with-param();
                    }
                    
                    /* @rule(override all) 
                    .entry__a {
                        propA: 1, 2; 
                        propB: 3, 4;
                    } */
                    .a {
                        -st-mixin: mix-with-param(
                            shallow connectArgs(1, 2),
                            deep connectArgs(3, 4)
                        );
                    }

                    /* @rule(partial override shallow) 
                    .entry__a {
                        propA: 1, 2;
                        propB: 1, 2;
                    } */
                    .a {
                        -st-mixin: mix-with-param(
                            shallow connectArgs(1, 2)
                        );
                    }

                    /* @rule(partial override deep) 
                    .entry__a {
                        propA: defaultA, defaultB; 
                        propB: 1, 2;
                    } */
                    .a {
                        -st-mixin: mix-with-param(
                            deep connectArgs(1, 2)
                        );
                    }
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
    });
    describe(`st-var`, () => {
        it(`should resolve mixin vars in mixin origin context `, () => {
            const { sheets } = testStylableCore({
                '/mix.st.css': `
                    :vars {
                        x: imported;
                    }
                    .mix {
                        val: value(x);
                    }
                `,
                '/entry.st.css': `
                    @st-import [mix as imported-mix] from './mix.st.css';
                    :vars {
                        x: local;
                    }
                    .local-mix {
                        val: value(x);
                    }

                    /* @rule(imported) .entry__root {val: imported} */
                    .root {
                        -st-mixin: imported-mix;
                    }

                    /* @rule(local) .entry__root {val: local} */
                    .root {
                        -st-mixin: local-mix;
                    }
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it(`should handle invalid cases `, () => {
            testStylableCore(`
                :vars {
                    x: local;
                }
                .mix {
                    val: value(x);
                }

                /* @rule .entry__root {val: local} */
                .root {
                    /* @transform-error ${mixinDiagnostics.INVALID_NAMED_PARAMS()} */
                    -st-mixin: mix(varNameWithNoValue);
                }
            `);
        });
        it(`should override mixin vars `, () => {
            const { sheets } = testStylableCore({
                '/mix.st.css': `
                    :vars {
                        x: importedX;
                        y: importedY;
                    }
                    .mix {
                        valX: value(x);
                        valY: value(y);
                    }
                `,
                '/entry.st.css': `
                    @st-import [mix as imported-mix] from './mix.st.css';
                    :vars {
                        x: localX;
                        y: localY;
                    }
                    .local-mix {
                        valX: value(x);
                        valY: value(y);
                    }

                    /* @rule(imported partial override) 
                        .entry__root {valX: override; valY: importedY} 
                    */
                    .root {
                        -st-mixin: imported-mix(x override);
                    }

                    /* @rule(local partial override) 
                        .entry__root {valX: override; valY: localY} 
                    */
                    .root {
                        -st-mixin: local-mix(x override);
                    }

                    /* @rule(imported multi override) 
                        .entry__root {valX: overrideX; valY: overrideY} 
                    */
                    .root {
                        -st-mixin: imported-mix(x overrideX, y overrideY);
                    }

                    /* @rule(local multi override) 
                        .entry__root {valX: overrideX; valY: overrideY} 
                    */
                    .root {
                        -st-mixin: local-mix(x overrideX, y overrideY);
                    }
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it(`should override vars with spaced value `, () => {
            const { sheets } = testStylableCore(`
                :vars {
                    color: red;
                    border: red;
                }
                .mix {
                    color: value(color);
                    border: value(border);
                }

                /* @rule .entry__root {
                    color: blue;
                    border: 1px solid green;
                } */
                .root {
                    -st-mixin: mix(
                        border 1px solid green,
                        color blue
                    );
                }
            `);

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it(`should un-escape override arguments`, () => {
            const { sheets } = testStylableCore(`
                :vars {
                    color: red;
                    font: Arial;
                }
                .mix {
                    color: value(color);
                    font-family: value(font);
                }
                
                /* @rule .entry__groot {
                    color: blue;
                    font-family: "Avenir Next", Arial;
                } */
                .groot {
                    -st-mixin: mix(
                        font "\\"Avenir Next\\", Arial",
                        color blue
                    );
                }
            `);

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it(`should override vars that are used as override `, () => {
            const { sheets } = testStylableCore({
                '/mix.st.css': `
                    :vars {
                        base-value: base;
                    }
                    .mix {
                        val: value(base-value);
                    }
                `,
                '/override-mix.st.css': `
                    @st-import [mix as base-mix] from './mix.st.css';
                    :vars {
                        override-a: a;
                    }
                    .mix {
                        -st-mixin: base-mix(
                            base-value value(override-a)
                        );
                    }
                `,
                '/entry.st.css': `
                    @st-import [mix as imported-override-mix] from './override-mix.st.css';

                    /* @rule(imported) .entry__root {val: green} */
                    .root {
                        -st-mixin: imported-override-mix(
                            override-a green
                        );
                    }

                    :vars {
                        override-b: b;
                    }
                    .local-override-mix {
                        -st-mixin: imported-override-mix(
                            override-a value(override-b)
                        );
                    }

                    /* @rule(local) .entry__root {val: green} */
                    .root {
                        -st-mixin: local-override-mix(
                            override-b green
                        );
                    }
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
    });
    describe(`st-custom-selector`, () => {
        it(`should mix class through a custom selector`, () => {
            const { sheets } = testStylableCore(`
                @custom-selector :--x .x, .not-x;

                :--x {
                    color: green;
                }

                /* @rule(inline) .entry__a { color: green } */
                .a {
                    -st-mixin: x;
                }
            `);

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it(`should mix class through a custom selector (deep)`, () => {
            const { sheets } = testStylableCore(`
                @custom-selector :--a .a;
                @custom-selector :--b .b:--a;

                .mix:--b {
                    color: green;
                }

                /* @rule(deep)[1] .entry__c.entry__b.entry__a { color: green } */
                .c {
                    -st-mixin: mix;
                }
            `);

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it.skip(`should attempt to correct compound order`, () => {
            // ToDo: fix compound selector ordering
            const { sheets } = testStylableCore(`
                @custom-selector :--div div;

                .mix:--div {
                    color: green;
                }

                /* @rule(fix composed)[1] div.entry__a { color: green } */
                .a {
                    -st-mixin: mix;
                }
            `);

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
    });
    describe(`higher-level feature integrations`, () => {
        // ToDo: move to their higher level feature spec when created
        describe(`css-asset`, () => {
            it(`should mix url relative to origin stylesheet path`, () => {
                const { sheets } = testStylableCore({
                    '/a/b/base.st.css': `
                        .mix {
                            background: url(./base.png);
                            content: url(../1-up.png);
                        }
                    `,
                    '/a/enrich.st.css': `
                        @st-import [mix] from './b/base.st.css';
                        .mix {
                            background: url(./enrich.png);
                            content: url(../1-up.png);
                        }
                    `,
                    '/entry.st.css': `
                        @st-import [mix] from './a/enrich.st.css';
    
                        .skip-mix {
                            /* ToDo: add check for asset from local override */
                            background: url(./entry.png);
                        }
    
                        /* 
                            @rule[0] .entry__a {
                                background: url(./a/b/base.png);
                                content: url(./a/1-up.png);
                            } 
                            @rule[1] .entry__a { 
                                background: url(./a/enrich.png);
                                content: url(./1-up.png);
                            } 
                        */
                        .a {
                            -st-mixin: mix;
                        }
                    `,
                });
                const { meta } = sheets['/entry.st.css'];

                shouldReportNoDiagnostics(meta);
            });
            it(`should keep url relative to mixin Javascript source`, () => {
                const { sheets } = testStylableCore({
                    '/a/b/mixin.js': `
                        module.exports = function(options) {
                            return {
                                background: [
                                    "url(./next-to-mixin.png)",
                                    "url(../../next-to-sheet.png)",
                                ]
                            }
                        }
                    `,
                    '/entry.st.css': `
                        @st-import mix from './a/b/mixin.js';
            
                        /* @rule .entry__root {
                            background: url(./a/b/next-to-mixin.png);
                            background: url(./next-to-sheet.png);
                        } */
                        .root {
                            -st-mixin: mix;
                        }
                    `,
                });

                const { meta } = sheets['/entry.st.css'];

                shouldReportNoDiagnostics(meta);
            });
            it(`should mix url relative to node_modules stylesheet`, () => {
                const { sheets } = testStylableCore({
                    '/node_modules/fake-package/package.json': {
                        content: '{"name": "fake-package", "version": "0.0.1"}',
                    },
                    '/node_modules/fake-package/mixin.st.css': `
                        .mix {
                            background: url(./css.png);
                        }
                    `,
                    '/node_modules/fake-package/mixin.js': `
                        module.exports.mix = function() {
                            return {
                                "background": 'url(./js.png)'
                            };
                        }
                    `,
                    '/entry.st.css': `
                        @st-import [mix as cssMixin] from 'fake-package/mixin.st.css';
                        @st-import [mix as jsMixin] from 'fake-package/mixin.js';
    
                        /* @rule(css) .entry__a {
                            background: url(./node_modules/fake-package/css.png);
                        } */
                        .a {
                            -st-mixin: cssMixin;
                        }
                        
                        /* @rule(js) .entry__a {
                            background: url(./node_modules/fake-package/js.png);
                        } */
                        .a {
                            -st-mixin: jsMixin;
                        }
                    `,
                });
                const { meta } = sheets['/entry.st.css'];

                shouldReportNoDiagnostics(meta);
            });
        });
        describe(`css-media`, () => {
            // ToDo: move nested expectation inline once inline nested path is available
            it(`should mix @media queries for nested CSS mixin`, () => {
                const { sheets } = testStylableCore({
                    '/mixin.st.css': `
                        .mix { id: before }
                        @media screen {
                            .mix { id: nested }
                        }
                        .mix { id: after }
                    `,
                    '/entry.st.css': `
                        @st-import [mix as css-mix] from './mixin.st.css';

                        /*
                            @rule[0] .entry__a { id: before }
                            @rule[1] screen
                            @rule[2] .entry__a { id: after }
                        */
                        .a {
                            -st-mixin: css-mix;
                        }
                    `,
                });
                const { meta } = sheets['/entry.st.css'];

                shouldReportNoDiagnostics(meta);

                matchRuleAndDeclaration(
                    meta.targetAst!.nodes[2] as postcss.Container,
                    0,
                    '.entry__a',
                    'id: nested'
                );
            });
            it(`should mix @media queries for nested JS mixin`, () => {
                const { sheets } = testStylableCore({
                    '/mixin.js': `
                        module.exports = function() {
                            return {
                                "@media screen": {
                                    "&": { id: "nested" }
                                },
                                "&": { id: "after" },
                            }
                        }
                    `,
                    '/entry.st.css': `
                        @st-import js-mix from './mixin.js';

                        /*
                            @rule[1] screen
                            @rule[2] .entry__a { id: after }
                        */
                        .a {
                            -st-mixin: js-mix;
                        }
                    `,
                });
                const { meta } = sheets['/entry.st.css'];

                shouldReportNoDiagnostics(meta);

                matchRuleAndDeclaration(
                    meta.targetAst!.nodes[2] as postcss.Container,
                    0,
                    '.entry__a',
                    'id: nested'
                );
            });
            it(`should mix @media queries as part of root mixin`, () => {
                const { sheets } = testStylableCore({
                    '/mixin.st.css': `
                        .mix { id: before }
                        @media screen {
                            .mix { id: nested }
                        }
                        .mix { id: after }
                    `,
                    '/entry.st.css': `
                        @st-import MixRoot from './mixin.st.css';

                        /*
                            @rule[0] .entry__a { }
                            @rule[1] .entry__a .mixin__mix { id: before }
                            @rule[2] screen
                            @rule[3] .entry__a .mixin__mix { id: after }
                        */
                        .a {
                            -st-mixin: MixRoot;
                        }
                    `,
                });
                const { meta } = sheets['/entry.st.css'];

                shouldReportNoDiagnostics(meta);

                matchRuleAndDeclaration(
                    meta.targetAst!.nodes[3] as postcss.Container,
                    0,
                    '.entry__a .mixin__mix',
                    'id: nested'
                );
            });
        });
        describe(`css-supports`, () => {
            // ToDo: move nested expectation inline once inline nested path is available
            it(`should mix @supports queries for nested CSS mixin`, () => {
                const { sheets } = testStylableCore({
                    '/mixin.st.css': `
                        .mix { id: before }
                        @supports (color: green) {
                            .mix { id: nested }
                        }
                        .mix { id: after }
                    `,
                    '/entry.st.css': `
                        @st-import [mix as css-mix] from './mixin.st.css';

                        /*
                            @rule[0] .entry__a { id: before }
                            @rule[1] (color: green)
                            @rule[2] .entry__a { id: after }
                        */
                        .a {
                            -st-mixin: css-mix;
                        }
                    `,
                });
                const { meta } = sheets['/entry.st.css'];

                shouldReportNoDiagnostics(meta);

                matchRuleAndDeclaration(
                    meta.targetAst!.nodes[2] as postcss.Container,
                    0,
                    '.entry__a',
                    'id: nested'
                );
            });
            it(`should mix @supports queries for nested JS mixin`, () => {
                const { sheets } = testStylableCore({
                    '/mixin.js': `
                        module.exports = function() {
                            return {
                                "@supports (color: green)": {
                                    "&": { id: "nested" }
                                },
                                "&": { id: "after" },
                            }
                        }
                    `,
                    '/entry.st.css': `
                        @st-import js-mix from './mixin.js';

                        /*
                            @rule[1] (color: green)
                            @rule[2] .entry__a { id: after }
                        */
                        .a {
                            -st-mixin: js-mix;
                        }
                    `,
                });
                const { meta } = sheets['/entry.st.css'];

                shouldReportNoDiagnostics(meta);

                matchRuleAndDeclaration(
                    meta.targetAst!.nodes[2] as postcss.Container,
                    0,
                    '.entry__a',
                    'id: nested'
                );
            });
            it(`should mix @supports queries as part of root mixin`, () => {
                const { sheets } = testStylableCore({
                    '/mixin.st.css': `
                        .mix { id: before }
                        @supports (color: green) {
                            .mix { id: nested }
                        }
                        .mix { id: after }
                    `,
                    '/entry.st.css': `
                        @st-import MixRoot from './mixin.st.css';

                        /*
                            @rule[0] .entry__a { }
                            @rule[1] .entry__a .mixin__mix { id: before }
                            @rule[2] (color: green)
                            @rule[3] .entry__a .mixin__mix { id: after }
                        */
                        .a {
                            -st-mixin: MixRoot;
                        }
                    `,
                });
                const { meta } = sheets['/entry.st.css'];

                shouldReportNoDiagnostics(meta);

                matchRuleAndDeclaration(
                    meta.targetAst!.nodes[3] as postcss.Container,
                    0,
                    '.entry__a .mixin__mix',
                    'id: nested'
                );
            });
        });
    });
    describe('stylable API', () => {
        it('should resolve mixin expression', () => {
            const { stylable, sheets } = testStylableCore({
                '/sheet.st.css': `
                    .mix-base-type {
                        prop: value(not-part-of-mixin);
                    }
                    .css-mix {
                        -st-extends: mix-base-type;
                        prop: value(bg-color);
                    }
                `,
                'code.js': `
                    module.exports = {
                        'code-mix': ([arg1, arg2]) => {
                            return { [arg1]: arg2 + '!' }
                        },
                        'code-str': "not valid mixin",
                    }
                `,
                '/entry.st.css': `
                    @st-import [css-mix as importedClassMix] from './sheet.st.css';
                    @st-import [code-mix as importedFuncMix, code-str] from './code.js';
                    .local-mix {
                        background: value(bg-size) value(bg-color);
                    }
                    .local-mix:hover {
                        background-color: value(bg-hover-color);
                    }
                    ElementMix {
                        color: value(colorList, value(color-index));
                    }
                    :vars {
                        st-var-name: "cannot be used as mixin";
                    }
                `,
            });
            const inputExpr = `
                local-mix(a 1, b value(x), c ' " , quotation and comma'), 
                importedClassMix(c 2),
                unknownBetweenMix(e 3),
                st-var-name(e 4),
                ElementMix(f 5, g 6),
                code-str(argX),
                importedFuncMix(argA, argB),
            `;

            const diagnostics = new Diagnostics();
            const resolvedMixins = stylable.stMixin.resolveExpr(
                sheets['/entry.st.css'].meta,
                inputExpr,
                {
                    diagnostics,
                    resolveOptionalArgs: true,
                }
            );

            expect(resolvedMixins[0], 'local-mix').to.eql({
                name: 'local-mix',
                kind: 'css-fragment',
                args: [{ a: '1' }, { b: 'value(x)' }, { c: ` " , quotation and comma` }],
                optionalArgs: new Map([
                    ['bg-size', { name: 'bg-size' }],
                    ['bg-color', { name: 'bg-color' }],
                    ['bg-hover-color', { name: 'bg-hover-color' }],
                ]),
            });
            expect(resolvedMixins[1], 'importedClassMix').to.eql({
                name: 'importedClassMix',
                kind: 'css-fragment',
                args: [{ c: '2' }],
                optionalArgs: new Map([['bg-color', { name: 'bg-color' }]]),
            });
            expect(resolvedMixins[2], 'unknownBetweenMix').to.eql({
                name: 'unknownBetweenMix',
                kind: 'invalid',
                args: 'e 3',
            });
            expect(resolvedMixins[3], 'st-var-name').to.eql({
                name: 'st-var-name',
                kind: 'invalid',
                args: 'e 4',
            });
            expect(resolvedMixins[4], 'ElementMix').to.eql({
                name: 'ElementMix',
                kind: 'css-fragment',
                args: [{ f: '5' }, { g: '6' }],
                optionalArgs: new Map([
                    ['colorList', { name: 'colorList' }],
                    ['color-index', { name: 'color-index' }],
                ]),
            });
            expect(resolvedMixins[5], 'code-str').to.eql({
                name: 'code-str',
                kind: 'invalid',
                args: 'argX',
            });
            const jsMix = resolvedMixins[6];
            expect(jsMix, 'importedFuncMix').to.deep.include({
                name: 'importedFuncMix',
                kind: 'js-func',
                args: ['argA', 'argB'],
            });
            expect(
                jsMix.kind === 'js-func' && jsMix.func(['color', 'green']),
                'importedFuncMix func ref'
            ).to.eql({ color: 'green!' });
            expect(diagnostics.reports, 'diagnostics').to.containSubset([
                STMixin.diagnostics.UNKNOWN_MIXIN('unknownBetweenMix'),
                STMixin.diagnostics.UNSUPPORTED_MIXIN_SYMBOL('st-var-name', 'var'),
                STMixin.diagnostics.JS_MIXIN_NOT_A_FUNC(),
            ]);
        });
        it('should combine two selectors', () => {
            const { stylable } = testStylableCore(``);
            const api = stylable.stMixin;

            expect(api.scopeNestedSelector('.a', '.b'), 'descendant').to.eql('.a .b');
            expect(api.scopeNestedSelector('.a', '&'), 'replacement').to.eql('.a');
            expect(api.scopeNestedSelector('.a', '&.b'), 'compound').to.eql('.a.b');
            expect(api.scopeNestedSelector('.a', ':not(&)'), 'nested').to.eql(':not(.a)');
            expect(api.scopeNestedSelector('.a', '.b&'), 'after').to.eql('.b.a');
        });
    });
});
