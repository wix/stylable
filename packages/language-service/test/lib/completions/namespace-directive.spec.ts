import { createRange } from '@stylable/language-service/dist/lib/completion-providers';
import { topLevelDirectives } from '@stylable/language-service/dist/lib/completion-types';
import * as asserters from '../../test-kit/completions-asserters';
import { expect } from 'chai';
import { createDiagnostics } from '../../test-kit/diagnostics-setup';
import deindent from 'deindent';

describe('Namespace Directive', () => {
    describe('should complete @st-namespace at top level ', () => {
        topLevelDirectives.namespace.split('').map((_c, i) => {
            const prefix = topLevelDirectives.namespace.slice(0, i);
            it(' with Prefix: ' + prefix + ' ', () => {
                const asserter = asserters.getCompletions('imports/top-level.st.css', prefix);
                asserter.suggested([
                    asserters.namespaceDirectiveCompletion(createRange(0, 0, 0, i)),
                ]);
            });
        });
    });

    it('should not complete @st-namespace if exists', () => {
        const asserter = asserters.getCompletions('imports/top-level-import-exists.st.css');
        asserter.notSuggested([asserters.namespaceDirectiveCompletion(createRange(0, 0, 0, 0))]);
    });

    it('should not complete @st-namespace inside rulesets', () => {
        const asserter = asserters.getCompletions('imports/inside-ruleset.st.css');
        asserter.notSuggested([asserters.namespaceDirectiveCompletion(createRange(0, 0, 0, 0))]);
    });

    it('should not complete @st-namespace inside selectors', () => {
        const asserter = asserters.getCompletions('imports/before-selector.st.css');
        asserter.notSuggested([asserters.namespaceDirectiveCompletion(createRange(0, 0, 0, 0))]);
    });

    it('should not complete @st-namespace inside media query', () => {
        const asserter = asserters.getCompletions('imports/media-query.st.css');
        asserter.notSuggested([asserters.namespaceDirectiveCompletion(createRange(0, 0, 0, 0))]);
    });
    it('should ignore native css lsp diagnostics unknown @st-namespace atrule', () => {
        const filePath = '/style.st.css';

        const diagnostics = createDiagnostics(
            {
                [filePath]: deindent`
                    @st-namespace "comp";
                `,
            },
            filePath
        );

        expect(diagnostics).to.eql([]);
    });
});
