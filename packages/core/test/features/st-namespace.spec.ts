import chaiSubset from 'chai-subset';
import { testStylableCore, shouldReportNoDiagnostics } from '@stylable/core-test-kit';
import chai, { expect } from 'chai';

chai.use(chaiSubset);

describe(`features/st-namespace`, () => {
    // ToDo: move and add tests when extracting feature
    it(`should override default namespace`, () => {
        const { sheets } = testStylableCore({
            '/other.st.css': `
                /* @transform-remove */
                @namespace "button";

                /* @rule .button__x */
                .x {}
            `,
        });

        const { meta, exports } = sheets['/other.st.css'];

        shouldReportNoDiagnostics(meta);

        // JS exports
        expect(exports.classes.x, `JS export`).to.eql(`button__x`);
    });
});
