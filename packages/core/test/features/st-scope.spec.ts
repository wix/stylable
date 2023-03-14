import { STGlobal } from '@stylable/core/dist/features';
import type { StylableMeta } from '@stylable/core';
import { testStylableCore, collectAst, shouldReportNoDiagnostics } from '@stylable/core-test-kit';
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
    describe('experimentalSelectorResolve', () => {
        it('should infer nested selector', () => {
            const { sheets } = testStylableCore(
                `
                    .a {
                        -st-states: shared;
                    }
                    .b {
                        -st-states: shared;
                    }
                    @st-scope .a, .b {
                        /* @rule(nest) .entry__a.entry--shared, .entry__b.entry--shared */
                        &:shared {}

                        /* @rule(context) .entry__a .entry__b, .entry__b .entry__b */
                        ::b {}
                    }
                `,
                { stylableConfig: { experimentalSelectorResolve: true } }
            );

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
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
                'direct'
            ).to.equal(queryStScope(meta, 'a'));
            expect(
                stylable.stScope.getStScope(queryBySelector(meta, '.nested')!),
                'nested'
            ).to.equal(queryStScope(meta, 'b'));
            expect(
                stylable.stScope.getStScope(queryBySelector(meta, '.error-nested-scope')!),
                'not-top-level-scope'
            ).to.equal(undefined);
        });
    });
});
