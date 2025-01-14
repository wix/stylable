import { expect } from 'chai';
import { testLangService } from '../test-kit/test-lang-service.js';

describe('LS: css-pseudo-class', () => {
    describe('svg', () => {
        it('should not report unknown properties from native lsp', () => {
            const { service } = testLangService(`
                    .path {
                        d: path("M0 0 L10 0 L10 10Z");
                    }
                `);

            const result = service.diagnose('/entry.st.css');

            expect(result).to.eql([]);
        });
    });
});
