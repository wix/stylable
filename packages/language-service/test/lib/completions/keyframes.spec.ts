import { expect } from 'chai';
import { createDiagnostics } from '../../test-kit/diagnostics-setup';
import deindent from 'deindent';

describe('keyframes', () => {
    it('should clear st-global from ident to allow css-lsp to function', () => {
        const filePath = '/style.st.css';

        const diagnostics = createDiagnostics(
            {
                [filePath]: deindent`
                    @keyframes st-global(abc) {}
                `,
            },
            filePath
        );

        expect(diagnostics).to.eql([]);
    });
});
