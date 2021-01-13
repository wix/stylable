import { expect } from 'chai';
import { createRange } from '../../../src/lib/completion-providers';
import { topLevelDirectives } from '../../../src/lib/completion-types';
import * as asserters from '../../../test-kit/completions-asserters';
import { createDiagnostics } from '../diagnostics.spec';

describe('@st-import Directive', () => {
    describe('should complete @st-import at top level ', () => {
        topLevelDirectives.stImport.split('').map((_c, i) => {
            const prefix = topLevelDirectives.stImport.slice(0, i);
            it(' with Prefix: ' + prefix + ' ', () => {
                const asserter = asserters.getCompletions('st-import/top-level.st.css', prefix);
                asserter.suggested([
                    asserters.stImportDirectiveCompletion(createRange(0, 0, 0, i)),
                ]);
            });
        });
    });

    it('should complete @st-import if exists', () => {
        const asserter = asserters.getCompletions('st-import/top-level-import-exists.st.css');
        asserter.suggested([asserters.stImportDirectiveCompletion(createRange(2, 0, 2, 0))]);
    });

    it('should not complete @st-import inside rulesets', () => {
        const asserter = asserters.getCompletions('imports/inside-ruleset.st.css');
        asserter.notSuggested([asserters.stImportDirectiveCompletion(createRange(2, 4, 2, 4))]);
    });

    it('should not complete @st-import inside selectors', () => {
        const asserter = asserters.getCompletions('imports/before-selector.st.css');
        asserter.notSuggested([asserters.stImportDirectiveCompletion(createRange(0, 0, 0, 0))]);
    });

    it('should not complete @st-import inside media query', () => {
        const asserter = asserters.getCompletions('imports/media-query.st.css');
        asserter.notSuggested([asserters.stImportDirectiveCompletion(createRange(1, 4, 1, 4))]);
    });

    it('should not complete @st-import inside @st-scope', () => {
        const asserter = asserters.getCompletions('st-scope/selector.st.css');
        asserter.notSuggested([asserters.stImportDirectiveCompletion(createRange(4, 4, 4, 4))]);
    });

    it('should create cross file errors', () => {
        const filePathA = '/style.css';
        const filePathB = '/import-style.st.css';

        const diagnostics = createDiagnostics(
            {
                [filePathA]: `
                .root {}
                .part {}
                `,
                [filePathB]: `@st-import Comp, [part] from "${filePathA}";`,
            },
            filePathB
        );

        expect(diagnostics).to.eql([]);
    });
});
