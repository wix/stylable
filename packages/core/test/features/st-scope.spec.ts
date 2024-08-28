import { STGlobal } from '@stylable/core/dist/features';
import type { StylableMeta } from '@stylable/core';
import {
    testStylableCore,
    collectAst,
    shouldReportNoDiagnostics,
    deindent,
} from '@stylable/core-test-kit';
import { expect } from 'chai';
import type * as postcss from 'postcss';

// const STScopeDiagnostics = diagnosticBankReportToStrings(STScope.diagnostics);

const queryBySelector = (meta: StylableMeta, selector: string): postcss.Rule | undefined => {
    let match: postcss.Rule | undefined;
    meta.sourceAst.walkRules((rule) => {
        if (rule.selector === selector) {
            match = rule;
            return false;
        }
        return;
    });
    return match;
};
const queryStScope = (meta: StylableMeta, params: string): postcss.AtRule | undefined => {
    for (const node of meta.sourceAst.nodes) {
        if (node.type === 'atrule' && node.name === 'st-scope' && node.params === params) {
            return node;
        }
    }
    return;
};

describe(`features/st-scope`, () => {
    // ToDo: move relevant tests here
    it('should allow nested global/external selectors', () => {
        const { sheets } = testStylableCore({
            '/external.st.css': ``,
            '/valid.st.css': `
                @st-import External, [root as external] from './external.st.css';
                @st-scope {
                    .external {}
                    External {}
                    div {}

                    @media screen and (max-width: 555px) {
                        .external {}
                        External {}
                        span {}
                    }
                }
            `,
        });

        const { meta } = sheets['/valid.st.css'];

        shouldReportNoDiagnostics(meta);
        expect(deindent(meta.targetAst!.toString())).to.eql(
            deindent(`
            .external__root {}
            .external__root {}
            div {}

            @media screen and (max-width: 555px) {
                .external__root {}
                .external__root {}
                span {}
            }
        `),
        );
    });
    it('should prepend scoping selector to nested rules', () => {
        const { sheets } = testStylableCore({
            '/external.st.css': `.part{}`,
            '/prepend.st.css': `
                @st-import External, [part as externalPart] from './external.st.css';
                @st-scope .s {

                    /* @rule .prepend__s .external__part */
                    .externalPart {}

                    /* @rule .prepend__s .external__root */
                    External {}

                    /* @rule .prepend__s div */
                    div {}

                    @media screen and (max-width: 555px) {

                        /* @rule .prepend__s .external__part */
                        .externalPart {}

                        /* @rule .prepend__s .external__root */
                        External {}

                        /* @rule .prepend__s span */
                        span {}
                    }
                }
            `,
        });

        const { meta } = sheets['/prepend.st.css'];

        shouldReportNoDiagnostics(meta);
    });
    describe('st-global', () => {
        it('should collect global rules', () => {
            const { sheets } = testStylableCore(`
                @st-scope :global(*) {
    
                    /* global: both st-scope and selector  */
                    :global(.in-global-st-scope) {}
    
                    /* local rule */
                    .in-global-st-scope {}
                }
    
                @st-scope .local {
    
                    /* st-scope adds locality */
                    :global(.in-local-st-scope) {}
                }
            `);

            const { meta } = sheets['/entry.st.css'];

            const actualGlobalRules = collectAst(meta.sourceAst, ['global']);
            expect(STGlobal.getGlobalRules(meta)).to.eql(actualGlobalRules['global']);
        });
    });
    it('should infer nested selector', () => {
        const { sheets } = testStylableCore(`
            .a {
                -st-states: shared;
            }
            .b {
                -st-states: shared;
            }
            @st-scope .a, .b {
                /* @rule(nest) .entry__a.entry--shared, .entry__b.entry--shared */
                &:shared {}
            }
        `);

        const { meta } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);
    });
    it('should infer default context as universal selector', () => {
        testStylableCore(`
            .a {
                -st-states: shared;
            }
            .b {
                -st-states: shared;
            }
            @st-scope .a, .b {
                /* @rule(universal context) .entry__a ::b, .entry__b ::b */
                ::b {}
            }
        `);
    });
    describe('stylable API', () => {
        it(`should get @st-scope for rule`, () => {
            const { stylable, sheets } = testStylableCore(`
                @st-scope a {
                    .direct {}
                }
                @st-scope b {
                    @media screen {
                        .nested {}
                    }
                }
                top-rule {
                    @st-scope c {
                        .error-nested-scope {}
                    }
                }
            `);

            const { meta } = sheets['/entry.st.css'];

            expect(
                stylable.stScope.getStScope(queryBySelector(meta, '.direct')!),
                'direct',
            ).to.equal(queryStScope(meta, 'a'));
            expect(
                stylable.stScope.getStScope(queryBySelector(meta, '.nested')!),
                'nested',
            ).to.equal(queryStScope(meta, 'b'));
            expect(
                stylable.stScope.getStScope(queryBySelector(meta, '.error-nested-scope')!),
                'not-top-level-scope',
            ).to.equal(undefined);
        });
    });
});
