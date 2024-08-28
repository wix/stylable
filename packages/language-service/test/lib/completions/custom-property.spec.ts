import { expect } from 'chai';
import { createDiagnostics } from '../../test-kit/diagnostics-setup';
import { deindent } from '@stylable/core-test-kit';

describe('custom property', () => {
    it('should ignore native css lsp diagnostics for @property body', () => {
        const filePath = '/style.st.css';

        const diagnostics = createDiagnostics(
            {
                [filePath]: deindent(`
                    @property --x;
                `),
            },
            filePath,
        );

        expect(diagnostics).to.eql([]);
    });
    it('should clear st-global from ident to allow css-lsp to function', () => {
        const filePath = '/style.st.css';

        const diagnostics = createDiagnostics(
            {
                [filePath]: deindent(`
                    @property st-global(--y) {
                        syntax: '<color>';
                        inherits: true; 
                        initial-value: green;
                    }
                `),
            },
            filePath,
        );

        expect(diagnostics).to.eql([]);
    });
});
