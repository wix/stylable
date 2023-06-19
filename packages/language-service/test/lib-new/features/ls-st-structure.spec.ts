import { expect } from 'chai';
import { testLangService } from '../../test-kit/test-lang-service';

describe('LS: st-structure', () => {
    // ToDo: refactor legacy flat mode tests cases here
    it('should not report unknown rule from native lsp', () => {
        const { service } = testLangService(`
                @st .x {
                    @st :y;
                    @st ::z => [z];
                }
            `);

        const result = service.diagnose('/entry.st.css');

        expect(result).to.eql([]);
    });
    it('should suggest nested parts', () => {
        const { service, carets, assertCompletions } = testLangService(`
            @st .cls {
                @st ::shallow => [shallow] {
                    @st ::deep => [deep];
                }
            }

            .cls^afterCls^ {}

            .cls::shallow^afterShallow^ {}
        `);
        const entryCarets = carets['/entry.st.css'];

        assertCompletions({
            message: 'afterCls',
            actualList: service.onCompletion('/entry.st.css', entryCarets.afterCls),
            expectedList: [{ label: '::shallow' }],
            unexpectedList: [{ label: '::deep' }],
        });

        assertCompletions({
            message: 'afterShallow',
            actualList: service.onCompletion('/entry.st.css', entryCarets.afterShallow),
            expectedList: [{ label: '::deep' }],
            unexpectedList: [{ label: '::shallow' }],
        });
    });
    it('should NOT automatically set classes as parts on .root (not legacy flat mode)', () => {
        const { service, carets, assertCompletions } = testLangService(`
            @st .cls {
                @st ::innerPart => [innerPart];
            }

            .root^afterRoot^ {}
        `);
        const entryCarets = carets['/entry.st.css'];

        assertCompletions({
            actualList: service.onCompletion('/entry.st.css', entryCarets.afterRoot),
            unexpectedList: [{ label: '::cls' }, { label: '::innerPart' }],
        });
    });
});
