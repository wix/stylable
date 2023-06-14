import {
    assertRule,
    diagnosticBankReportToStrings,
    shouldReportNoDiagnostics,
    testStylableCore,
    spyCalls,
} from '@stylable/core-test-kit';
import {
    CSSClass,
    STStructure,
    transformerDiagnostics,
    STCustomState,
} from '@stylable/core/dist/index-internal';
import { expect } from 'chai';

const transformerStringDiagnostics = diagnosticBankReportToStrings(transformerDiagnostics);
const stStructureDiagnostics = diagnosticBankReportToStrings(STStructure.diagnostics);
const stStateDiagnostics = diagnosticBankReportToStrings(STCustomState.diagnostics);
const classDiagnostics = diagnosticBankReportToStrings(CSSClass.diagnostics);

describe('@st structure', () => {
    it('should warn experimental feature', () => {
        const warnSpy = spyCalls(console, 'warn');
        const filterExpCalls = () =>
            warnSpy.calls.filter(
                ([msg]) => typeof msg === 'string' && msg === STStructure.experimentalMsg
            );

        // no warn without using @st
        testStylableCore(`
            .root{}
        `);

        expect(filterExpCalls(), 'not used').to.have.lengthOf(0);

        // reset calls
        warnSpy.resetSpy();

        testStylableCore(`
            @st;
            @st;
        `);

        expect(filterExpCalls(), 'only once').to.have.lengthOf(1);

        warnSpy.restoreSpy();
    });
    it('should have no implicit root', () => {
        const { sheets } = testStylableCore(`
            @st .comp;
        `);

        const { meta, exports } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);
        expect(exports.classes.root).to.eql(undefined);
    });
    describe('@st .name (top level class)', () => {
        it('should prevent automatic .class=>::part definition', () => {
            testStylableCore(`
                @st .root;
                .part {}
    
                /* 
                    @transform-error ${transformerStringDiagnostics.UNKNOWN_PSEUDO_ELEMENT(`part`)}
                    @rule .entry__root::part
                */
                .root::part {}
            `);
        });
        it('should register css class', () => {
            const { sheets } = testStylableCore(`
                @st .abc;
                @st .xyz {}
                @st .comment /*comment*/ {}
                .normal-class {}
            `);

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
            expect(meta.getAllClasses()).to.have.keys(['abc', 'xyz', 'comment', 'normal-class']);
        });
        it('should be valid only at top level', () => {
            testStylableCore(`
                @st .abc {
                    /* @analyze-error ${stStructureDiagnostics.CLASS_OUT_OF_CONTEXT()} */
                    @st .xyz;
                }
            `);
        });
        it('should report re-decare', () => {
            testStylableCore(`
                @st .dup;

                /* @analyze-error word(.dup) ${stStructureDiagnostics.REDECLARE('class', '.dup')} */
                @st .dup;
            `);
        });
        it('should report non-class definition', () => {
            const { sheets } = testStylableCore(`
                /* @analyze-error(element) ${stStructureDiagnostics.UNSUPPORTED_TOP_DEF()} */
                @st abc;

                /* @analyze-error(attribute) ${stStructureDiagnostics.UNSUPPORTED_TOP_DEF()} */
                @st [abc];

                /* @analyze-error(pseudo-element) ${stStructureDiagnostics.UNSUPPORTED_TOP_DEF()} */
                @st ::abc;

                /* @analyze-error(pseudo-class) ${stStructureDiagnostics.UNSUPPORTED_TOP_DEF()} */
                @st :abc;

                /* @analyze-error(multi classes) ${stStructureDiagnostics.UNSUPPORTED_TOP_DEF()} */
                @st .a.b;
            `);

            const { meta } = sheets['/entry.st.css'];

            expect(CSSClass.getAll(meta)).to.eql({});
        });
        it('should extend another class', () => {
            const { sheets } = testStylableCore(`
                @st .abc :is(.defined-class-inline);
                @st .xyz :is(.existing-class-after);

                .existing-class-after {
                    -st-states: state;
                };

                /* @rule .entry__xyz.entry--state */
                .xyz:state {}
            `);

            const { meta, exports } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
            expect(exports.classes.abc, 'composed inline def').to.eql(
                'entry__abc entry__defined-class-inline'
            );
        });
        it('should disallow unsupported extends', () => {
            testStylableCore(`
                /* @analyze-error(element) ${stStructureDiagnostics.MISSING_EXTEND()}*/
                @st .xyz :is(root);

                /* @analyze-error(multi class) ${stStructureDiagnostics.MISSING_EXTEND()}*/
                @st .xyz :is(.a, .b);
            `);
        });
        it('should error on non local definition', () => {
            testStylableCore({
                'origin.st.css': `
                    .external {}
                `,
                'entry.st.css': `
                    @st-import [external] from "./origin.st.css";

                    /* @analyze-error ${stStructureDiagnostics.OVERRIDE_IMPORTED_CLASS()}*/
                    @st .external;
                `,
            });
        });
        it('should register css class selector mapping', () => {
            const { sheets } = testStylableCore(`
                @st .abc => :global(.xyz);

                @st .comments =>/*c1*/:global(.comments);
    
                /* @rule(standalone) .xyz */
                .abc {}
                
                /* @rule(comments) .comments */
                .comments {}
            `);

            const { meta, exports } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            expect(exports.classes.abc, 'single global class export').to.eql('xyz');
        });
        it('should report selector mapping diagnostics', () => {
            testStylableCore({
                'general.st.css': `
                    /* @analyze-error(empty) ${stStructureDiagnostics.MISSING_MAPPED_SELECTOR()} */
                    @st .empty => ;
        
                    /* @rule(not global) .general__empty */
                    .empty {}

                    /* @analyze-error(multi) ${stStructureDiagnostics.MULTI_MAPPED_SELECTOR()} */
                    @st .multi => .a, .b;
        
                    /* @rule(multi) .general__multi */
                    .multi {}
                `,
                'global.st.css': `
                    /* @analyze-error(not global) word(.xyz) ${stStructureDiagnostics.GLOBAL_MAPPING_LIMITATION()} */
                    @st .not-global => .xyz;
        
                    /* @rule(not global) .global__not-global */
                    .not-global {}

                    /* @analyze-error(not global pseudo) ${stStructureDiagnostics.GLOBAL_MAPPING_LIMITATION()} */
                    @st .top-level-is => :is(.xyz);
        
                    /* @rule(not global pseudo) .global__top-level-is */
                    .top-level-is {}

                    /* @analyze-error(empty global) ${stStructureDiagnostics.GLOBAL_MAPPING_LIMITATION()} */
                    @st .empty-global => :global;

                    /* @analyze-error(no value global) ${stStructureDiagnostics.GLOBAL_MAPPING_LIMITATION()} */
                    @st .no-value-global => :global();

                    /* @analyze-error(multi global) ${stStructureDiagnostics.GLOBAL_MAPPING_LIMITATION()} */
                    @st .multi-global => :global(.a, .b);

                    /* @analyze-error(more then one global) ${stStructureDiagnostics.GLOBAL_MAPPING_LIMITATION()} */
                    @st .more-then-one-global => :global(.a) :global(.b);
        
                    /* @rule(multi global) .global__multi-global */
                    .multi-global {}
                `,
            });
        });
        it('should report unexpected extra value', () => {
            testStylableCore(`
                /* @analyze-error word(unexpected value) ${stStructureDiagnostics.UNEXPECTED_EXTRA_VALUE(
                    'unexpected value'
                )} */
                @st .empty unexpected value;
            `);
        });
    });
    describe('@st :name (pseudo-class)', () => {
        it('should define pseudo-class on parent class def', () => {
            const { sheets } = testStylableCore(`
                @st .x {
                    @st :bool;
                    @st :ops(enum(a, b));
                    @st :opsWithDefault(enum(w, x, y, z)) x;
                }

                /* @rule(bool) .entry__x.entry--bool*/
                .x:bool {}

                /* @rule(param) .entry__x.entry---ops-1-b*/
                .x:ops(b) {}

                /* @rule(default param) .entry__x.entry---opsWithDefault-1-x*/
                .x:opsWithDefault {}
            `);

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it('should be nested in `@st .class{}`', () => {
            testStylableCore(`
                /* @analyze-error ${stStructureDiagnostics.STATE_OUT_OF_CONTEXT()}*/
                @st :top-level;

                @media {
                    /* @analyze-error ${stStructureDiagnostics.STATE_OUT_OF_CONTEXT()}*/
                    @st :in-at-rule;
                }
            `);
        });
        it('should report parsing issues', () => {
            testStylableCore(`
                @st .x {
                    /* @analyze-warn ${stStateDiagnostics.NO_STATE_TYPE_GIVEN('bool')}*/
                    @st :bool();

                    /* @analyze-error ${stStateDiagnostics.STATE_STARTS_WITH_HYPHEN('-dashProxy')}*/
                    @st :-dashProxy;
                    
                    /* @analyze-error ${stStructureDiagnostics.UNEXPECTED_EXTRA_VALUE('abc xyz')}*/
                    @st :boolWithExtra abc xyz;
                }
            `);
        });
        it('should report re-declare of state (first win)', () => {
            testStylableCore(`
                @st .x {
                    @st :conflict(string);

                    /* @analyze-error word(:conflict) ${stStructureDiagnostics.REDECLARE(
                        'pseudo-state',
                        ':conflict'
                    )} */
                    @st :conflict(enum(a, b)) b;
                }

                /* @rule .entry__x.entry---conflict-3-ccc */
                .x:conflict(ccc) {}
            `);
        });
    });
    describe('@st ::name (pseudo-element)', () => {
        it('should define pseudo-element on parent class def', () => {
            const { sheets } = testStylableCore(`
                @st .x {
                    @st ::part => [part="x"];

                    @st ::noSpaces=>[noSpaces];

                    @st /*c1*/ :/*what?*/:/*c2*/comments/*c3*/=> [weirdComment]/*c5*/;

                    @st ::unscoped => unscopedElement;
                }

                /* @rule .entry__x [part="x"] */
                .x::part {}

                /* @rule .entry__x [noSpaces] */
                .x::noSpaces {}

                /* @rule .entry__x [weirdComment] */
                .x::comments {}
                
                /* @rule .entry__x unscopedElement */
                .x::unscoped {}
            `);

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it('should define compound mapping', () => {
            const { sheets } = testStylableCore(`
                @st .x {
                    @st ::compound => &[compound];

                    @st ::withComments => /*c1*/&/*c2*/[withComments]/*c3*/;
                }

                /* @rule .entry__x[compound] */
                .x::compound {}
                
                .x::withComments {}
            `);

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            /* Notice:
             * - comment 1 is removed by postcss for unknown reasons
             * - comment 3 is ignored because postcss takes it as part of the "between" (prelude and open bracket)
             */
            expect(assertRule(meta.targetAst!.nodes[3]).selector, 'with comments').to.eql(
                '.entry__x/*c2*/[withComments]'
            );
        });
        it('should analyze selector mapping', () => {
            const { sheets } = testStylableCore(`
                @st .x {
                    @st ::part => .innerClass;
                }
            `);

            const { meta, exports } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
            expect(exports.classes.innerClass, 'class definition').to.eql('entry__innerClass');
        });
        it('should define nested pseudo-elements', () => {
            const { sheets } = testStylableCore(`
                @st .x {
                    @st ::first => [first] {
                        @st ::second => [second];
                    };
                }

                /* @rule .entry__x [first] [second] */
                .x::first::second {}
            `);

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it('should resolve inherited parts', () => {
            const { sheets } = testStylableCore({
                'base.st.css': `
                    @st .base {
                        @st ::part => [part="x"];
                    }
                `,
                'legacy.st.css': `
                    @st-import [base] from "./base.st.css";
                    .clsA {
                        -st-extends: base;
                    }
                `,
                'entry.st.css': `
                    @st-import Legacy, [clsA] from "./legacy.st.css";

                    @st .root :is(.Legacy);
                    @st .clsB :is(.clsA);

                    /* @rule(extend) .entry__clsB [part="x"] */
                    .clsB::part {}

                    /* @rule(through extending part) .entry__root .legacy__clsA [part="x"] */
                    .root::clsA::part {}
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it('should be invalid out of `@st .class{}` and `@st ::part`', () => {
            testStylableCore(`
                /* @analyze-error ${stStructureDiagnostics.ELEMENT_OUT_OF_CONTEXT()}*/
                @st ::top-level => .top;

                @media {
                    /* @analyze-error ${stStructureDiagnostics.ELEMENT_OUT_OF_CONTEXT()}*/
                    @st ::in-at-rule => .media;
                }
            `);
        });
        it('should report mapped selector issues', () => {
            testStylableCore(`
                @st .x {
                    /* @analyze-error ${stStructureDiagnostics.MISSING_MAPPED_SELECTOR()}*/
                    @st ::missing-selector => ;

                    /* @analyze-error ${stStructureDiagnostics.MULTI_MAPPED_SELECTOR()}*/
                    @st ::multi-selector => .a, .b;

                    /* @analyze-error ${stStructureDiagnostics.MISSING_MAPPING()}*/
                    @st ::missing-mapping ;

                    /* @analyze-error ${stStructureDiagnostics.MAPPING_UNSUPPORTED_NESTING()}*/
                    @st ::multi-selector => .a:not(&);
                }
            `);
        });
        it('should report definition issues', () => {
            // ToDo: report on the original definition as well
            const { sheets } = testStylableCore({
                'invalid.st.css': `
                    @st .x {
                        @st ::duplicate => .a;

                        /* @analyze-error word(::duplicate) ${stStructureDiagnostics.REDECLARE(
                            'pseudo-element',
                            '::duplicate'
                        )}*/
                        @st ::duplicate => .b;
                        
                        /* @analyze-error ${stStructureDiagnostics.INVALID_ST_DEF(
                            ': :invalidSpace => .c'
                        )}*/
                        @st : :invalidSpace => .c;
                    }

                    /* @rule .invalid__x::invalidSpace */
                    .x::invalidSpace {}
                `,
                'valid.st.css': `
                    @st .x {
                        @st ::noConflict => .xChild {
                            @st ::noConflict => .deepChild;
                        };
                    }
                    @st .y {
                        @st ::noConflict => .yChild;
                    }
                `,
            });

            const { meta } = sheets['/valid.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it('should infer nested pseudo-element', () => {
            const { sheets } = testStylableCore({
                'def.st.css': `
                    @st .x {
                        @st ::a => .base {
                            @st ::aChild => .deep;
                        }
                        @st ::b => .base;
                    }
                    @st .base {
                        @st ::baseChild => .baseChild;
                    }
                `,
                'valid.st.css': `
                    @st-import [x] from './def.st.css';
                    
                    /* @rule(a::aChild) .valid__t .def__x .def__base .def__deep */
                    .t .x::a::aChild {}

                    /* @rule(a::baseChild) .valid__t .def__x .def__base .def__baseChild */
                    .t .x::a::baseChild {}

                    /* @rule(b::baseChild) .valid__t .def__x .def__base .def__baseChild */
                    .t .x::b::baseChild {}
                `,
                'invalid.st.css': `
                    @st-import [x] from './def.st.css';

                    .x::a::aChild {/*cause resolve of base*/}
                    /* @rule(base infer unmodified) .def__x .def__base::aChild */
                    .x::b::aChild {}
                `,
            });

            const { meta } = sheets['/valid.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it('should define pseudo-class for pseudo-element', () => {
            const { sheets } = testStylableCore(`
                @st .base {
                    @st :baseState;
                }

                @st .x {
                    @st ::a => .base {
                        @st :aState;
                    }
                }

                /* @rule(a::aState) .entry__x .entry__base.entry--aState */
                .x::a:aState {}

                /* @rule(a::baseState) .entry__x .entry__base.entry--baseState */
                .x::a:baseState {}
            `);

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
    });
    describe('@st-import', () => {
        it('should handle default import with no implicit root', () => {
            // ToDo: choose how to handle from a structure move stylesheet
            testStylableCore({
                'origin.st.css': `
                    @st .x {}
                `,
                'entry.st.css': `
                    @st-import Default from "./origin.st.css";

                    .y {
                        /* @transform-error ${classDiagnostics.CANNOT_EXTEND_UNKNOWN_SYMBOL(
                            'default'
                        )} */
                        -st-extends: Default;
                    }
                `,
            });
        });
    });
    describe('native css', () => {
        it('should not collect `@st` definition from non stylable file', () => {
            testStylableCore({
                'native.css': `
                    @st .x {
                        @st ::y => .z;
                    }
                `,
                'entry.st.css': `
                    @st-import [x] from './native.css';

                    /* @rule(not existing on native) .entry__x */
                    .x {}
                `,
            });
        });
    });
});
