import { expect } from 'chai';
import { createDiagnostics } from '../../test-kit/diagnostics-setup.js';
import { deindent } from '@stylable/core-test-kit';

describe('keyframes', () => {
    it('should clear st-global from ident to allow css-lsp to function', () => {
        const filePath = '/style.st.css';

        const diagnostics = createDiagnostics(
            {
                [filePath]: deindent(`
                    @keyframes st-global(abc) {}
                `),
            },
            filePath,
        );

        expect(diagnostics).to.eql([]);
    });
});
