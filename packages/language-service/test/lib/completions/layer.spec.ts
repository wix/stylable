import { expect } from 'chai';
import { createDiagnostics } from '../../test-kit/diagnostics-setup';
import { deindent } from '@stylable/core-test-kit';

describe('layer', () => {
    it('should clear st-global from ident to allow css-lsp to function', () => {
        const filePath = '/style.st.css';

        const diagnostics = createDiagnostics(
            {
                [filePath]: deindent(`
                    @layer aaa, st-global(bbb), ccc, st-global(ddd);
                `),
            },
            filePath,
        );

        expect(diagnostics).to.eql([]);
    });
});
