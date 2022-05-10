import chaiSubset from 'chai-subset';
import { CSSType } from '@stylable/core/dist/features';
import {
    testStylableCore,
    shouldReportNoDiagnostics,
    diagnosticBankReportToStrings,
} from '@stylable/core-test-kit';
import chai, { expect } from 'chai';

chai.use(chaiSubset);

const cssTypeDiagnostics = diagnosticBankReportToStrings(CSSType.diagnostics);

describe('features/st-custom-selector', () => {
    // ToDo: move and add tests when extracting feature
    // ToDo: migrate to @st-custom-selector
    it('should define selector symbols', () => {
        const { sheets } = testStylableCore(`
            /* @transform-remove */
            @custom-selector :--node .root > .node;
        `);

        const { meta, exports } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

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
