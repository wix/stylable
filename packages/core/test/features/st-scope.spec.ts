// import { STScope } from '@stylable/core/dist/features';
import type { StylableMeta } from '@stylable/core';
import { testStylableCore } from '@stylable/core-test-kit';
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

    describe('stylable API', () => {
        it.only(`should get @st-scope for rule`, () => {
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
