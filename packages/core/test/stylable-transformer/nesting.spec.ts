import {
    diagnosticBankReportToStrings,
    shouldReportNoDiagnostics,
    testStylableCore,
} from '@stylable/core-test-kit';
import { CSSPseudoClass } from '@stylable/core/dist/features';

const cssPseudoClassDiagnostics = diagnosticBankReportToStrings(CSSPseudoClass.diagnostics);

describe('transformer/nesting', () => {
    it('should bind & to nesting selector', () => {
        const { sheets } = testStylableCore(`
            .x {
                -st-states: y;
            }

            /* @rule .entry__x */
            .x {
                /* @rule &.entry--y */
                &:y {}
            }
        `);

        const { meta } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);
    });
    it('should reset selector inference to nearest ancestor style rule', () => {
        const { sheets } = testStylableCore(`
            .x {
                -st-states: xxx;
            }
            .y {
                -st-states: yyy;
            }

            .x {
                /* @rule &.entry--xxx */
                &:xxx {
                    .y {
                        /* @rule &.entry--yyy */
                        &:yyy {}
                    }
                }
            }
        `);

        const { meta } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);
    });
    it('should reset selector inference to nearest ancestor style rule (in atrule)', () => {
        const { sheets } = testStylableCore(`
            .x {
                -st-states: xxx;
            }

            .x {
                @media {
                    @media {
                        /* @rule &.entry--xxx */
                        &:xxx {}
                    }
                }
            }
        `);

        const { meta } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);
    });
    it('should bind to selector intersection', () => {
        testStylableCore(
            `
                .x {
                    -st-states: shared, onlyX;
                }
                .y {
                    -st-states: shared;
                }

                .x, .y {
                    /* @rule &.entry--shared */
                    &:shared {}

                    /* 
                        @transform-error ${cssPseudoClassDiagnostics.UNKNOWN_STATE_USAGE('onlyX')} 
                        @rule &:onlyX
                    */
                    &:onlyX {}
                }
            `,
        );
    });
    describe('experimentalSelectorInference=false', () => {
        it('should infer to universal selector without nesting selector', () => {
            testStylableCore(
                `
                .root {
                    -st-states: x;
                }
                .part {
                    -st-states: x;
                }

                .part {
                    /* 
                        @transform-error(first) ${cssPseudoClassDiagnostics.UNKNOWN_STATE_USAGE(
                            'x',
                        )}
                        @rule(first) :x 
                    */
                    :x {}

                    /* 
                        @transform-error(after combinator) ${cssPseudoClassDiagnostics.UNKNOWN_STATE_USAGE(
                            'x',
                        )}
                        @rule(after combinator) .entry__root :x 
                    */
                    .root :x {}
                }

                /* 
                    legacy behavior without "experimentalSelectorInference"
                    @rule(after combinator) .entry__root .entry--x  
                */
                .root :x {}
            `,
                {
                    stylableConfig: { experimentalSelectorInference: false },
                },
            );
        });
    });
});
