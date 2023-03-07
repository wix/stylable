import chaiSubset from 'chai-subset';
import { STCustomSelector, CSSType } from '@stylable/core/dist/features';
import {
    testStylableCore,
    shouldReportNoDiagnostics,
    diagnosticBankReportToStrings,
} from '@stylable/core-test-kit';
import chai, { expect } from 'chai';

chai.use(chaiSubset);

const customSelectorDiagnostics = diagnosticBankReportToStrings(STCustomSelector.diagnostics);
const cssTypeDiagnostics = diagnosticBankReportToStrings(CSSType.diagnostics);

describe('features/st-custom-selector', () => {
    // ToDo: migrate to @st-custom-selector
    it('should define selector symbols', () => {
        const { sheets } = testStylableCore(`
            /* @transform-remove */
            @custom-selector :--node .root > .node;
        `);

        const { meta, exports } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        const nodeSelector = STCustomSelector.getCustomSelectorExpended(meta, 'node');
        expect(nodeSelector, 'programmatic get selector').to.equal('.root > .node');

        // JS exports
        expect(exports.classes.node, 'JS export').to.eql('entry__node');
    });
    it('should expand rule selector', () => {
        const { sheets } = testStylableCore(`
            @custom-selector :--node .a > .b ~ .c;

            /* @rule(just custom) .entry__a > .entry__b ~ .entry__c */
            :--node {}

            /* @rule(complex) .entry__x.entry__a > .entry__b ~ .entry__c.entry__y */
            .x:--node.y {}
        `);

        const { meta } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);
    });
    it('should expand into into nested selector', () => {
        const { sheets } = testStylableCore(`
            @custom-selector :--A .a;
            @custom-selector :--B .b;

            /* @rule(simple) .entry__root:has(.entry__a, .entry__z, .entry__b) */
            .root:has(:--A, .z, :--B) {}
        `);

        const { meta } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);
    });
    it('should handle unknown custom selector', () => {
        testStylableCore(`
            /* @analyze-error(in custom) word(:--unknown) ${customSelectorDiagnostics.UNKNOWN_CUSTOM_SELECTOR(
                ':--unknown'
            )} */
            @custom-selector :--x .before:--unknown.after;

            /* 
                @transform-error(in selector) word(:--unknown)  ${customSelectorDiagnostics.UNKNOWN_CUSTOM_SELECTOR(
                    ':--unknown'
                )} 
                @rule .entry__before:--unknown.entry__after {}
            */
            .before:--unknown.after {}
        `);
    });
    it('should report selector on atrule', () => {
        testStylableCore(`
            /* @analyze-error ${cssTypeDiagnostics.INVALID_FUNCTIONAL_SELECTOR('div', 'type')} */
            @custom-selector :--functional-div div();
        `);
    });
    it('should validate scope on used selector (rule)', () => {
        const { sheets } = testStylableCore(`
            @custom-selector :--unscoped div;
            @custom-selector :--scoped .root div;

            /* @analyze-warn ${cssTypeDiagnostics.UNSCOPED_TYPE_SELECTOR('span')} */
            :--unscoped span {}

            :--scoped ul {}
        `);

        const { meta } = sheets['/entry.st.css'];

        expect(
            meta.diagnostics.reports.length,
            'only a single unscoped diagnostic for span'
        ).to.eql(1);
    });
});
