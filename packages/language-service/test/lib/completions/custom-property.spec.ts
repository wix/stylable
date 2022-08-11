import { expect } from 'chai';
import { createDiagnostics } from '../../test-kit/diagnostics-setup';
import deindent from 'deindent';

describe('custom property', () => {
    it('should ignore native css lsp diagnostics unknown @property at-rule', () => {
        // remove once css lsp supports is added or we implement the complete lsp ourselves
        const filePath = '/style.st.css';

        const diagnostics = createDiagnostics(
            {
                [filePath]: deindent`
                    @property --x;
                    @property --y {
                        syntax: '<color>';
                        inherits: true; 
                        initial-value: green;
                    }
                `,
            },
            filePath
        );

        expect(diagnostics).to.eql([]);
    });
});
