import {
    diagnosticBankReportToStrings,
    shouldReportNoDiagnostics,
    testStylableCore,
} from '@stylable/core-test-kit';
import { STStructure, transformerDiagnostics } from '@stylable/core/dist/index-internal';
import { expect } from 'chai';

const transformerStringDiagnostics = diagnosticBankReportToStrings(transformerDiagnostics);
const stStructureDiagnostics = diagnosticBankReportToStrings(STStructure.diagnostics);

type FuncParameters<F> = F extends (...args: any[]) => any ? Parameters<F> : never;

const spy = <T, N extends keyof T>(target: T, funcName: N) => {
    const origin = target[funcName];

    if (typeof origin !== 'function') {
        throw new Error('spy only supports functions');
    }

    // type OriginType = FuncType<typeof origin>;
    type OriginArgs = FuncParameters<typeof origin>;
    const calls: OriginArgs[] = [];

    // proxy
    target[funcName] = ((...args: OriginArgs[]) => {
        // record
        calls.push([...args] as any);
        // call original
        return origin(...args);
    }) as T[N];
    return {
        calls,
        restoreSpy() {
            target[funcName] = origin;
        },
    };
};

describe('@st structure', () => {
    it('should warn experimental feature', () => {
        const { restoreSpy, calls } = spy(console, 'warn');
        const filterExpCalls = () =>
            calls.filter(([msg]) => typeof msg === 'string' && msg === STStructure.experimentalMsg);

        // no warn without using @st
        testStylableCore(`
            .root{}
        `);

        expect(filterExpCalls(), 'not used').to.have.lengthOf(0);

        // reset calls
        calls.length = 0;

        testStylableCore(`
            @st;
            @st;
        `);

        expect(filterExpCalls(), 'only once').to.have.lengthOf(1);

        restoreSpy();
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
        it('should register css class + no implicit root', () => {
            const { sheets } = testStylableCore(`
                @st .abc;
                @st .xyz {}
                @st .comment /*comment*/ {}
                .normal-class {}
            `);

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
            expect(meta.getAllClasses()).to.have.keys([
                'root',
                'abc',
                'xyz',
                'comment',
                'normal-class',
            ]);
        });
        it('should report non-class definition', () => {
            testStylableCore(`
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
        it('should report expected missing extended class reference', () => {
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
    
                /* @rule(standalone) .xyz */
                .abc {}
            `);

            const { meta, exports } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            expect(exports.classes.abc, 'single global class export').to.eql('xyz');
        });
        it('should report selector mapping diagnostics', () => {
            testStylableCore({
                'general.st.css': `
                    /* @analyze-error(empty) ${stStructureDiagnostics.INVALID_MAPPING()} */
                    @st .empty => ;
        
                    /* @rule(not global) .general__empty */
                    .empty {}

                    /* @analyze-error(multi) ${stStructureDiagnostics.INVALID_MAPPING()} */
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

                    /* @analyze-error(multi global) ${stStructureDiagnostics.GLOBAL_MAPPING_LIMITATION()} */
                    @st .multi-global => :global(.a, .b);
        
                    /* @rule(multi global) .global__multi-global */
                    .multi-global {}
                `,
            });
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
    });
});
