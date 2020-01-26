import { createRange } from '../../../src/lib/completion-providers';
import { topLevelDirectives } from '../../../src/lib/completion-types';
import * as asserters from '../../../test-kit/completions-asserters';

describe('Namespace Directive', () => {
    describe('should complete @namespace at top level ', () => {
        topLevelDirectives.namespace.split('').map((_c, i) => {
            const prefix = topLevelDirectives.namespace.slice(0, i);
            it(' with Prefix: ' + prefix + ' ', () => {
                const asserter = asserters.getCompletions('imports/top-level.st.css', prefix);
                asserter.suggested([
                    asserters.namespaceDirectiveCompletion(createRange(0, 0, 0, i))
                ]);
            });
        });
    });

    it('should not complete @namespace if exists', () => {
        const asserter = asserters.getCompletions('imports/top-level-import-exists.st.css');
        asserter.notSuggested([asserters.namespaceDirectiveCompletion(createRange(0, 0, 0, 0))]);
    });

    it('should not complete @namespace inside rulesets', () => {
        const asserter = asserters.getCompletions('imports/inside-ruleset.st.css');
        asserter.notSuggested([asserters.namespaceDirectiveCompletion(createRange(0, 0, 0, 0))]);
    });

    it('should not complete @namespace inside selectors', () => {
        const asserter = asserters.getCompletions('imports/before-selector.st.css');
        asserter.notSuggested([asserters.namespaceDirectiveCompletion(createRange(0, 0, 0, 0))]);
    });

    it('should not complete @namespace inside media query', () => {
        const asserter = asserters.getCompletions('imports/media-query.st.css');
        asserter.notSuggested([asserters.namespaceDirectiveCompletion(createRange(0, 0, 0, 0))]);
    });
});
