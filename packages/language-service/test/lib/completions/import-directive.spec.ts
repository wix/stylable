import { createRange } from '../../../src/lib/completion-providers';
import { topLevelDirectives } from '../../../src/lib/completion-types';
import * as asserters from '../../../test-kit/completions-asserters';

describe('Import Directive', () => {
    describe('should complete :import at top level ', () => {
        topLevelDirectives.import.split('').map((_c, i) => {
            const prefix = topLevelDirectives.import.slice(0, i);
            it("when it doesn't exist, with prefix: " + prefix + ' ', async () => {
                const asserter = await asserters.getCompletions('imports/top-level.st.css', prefix);
                asserter.suggested([asserters.importDirectiveCompletion(createRange(0, 0, 0, i))]);
            });

            it('when it exists, with prefix: ' + prefix + ' ', async () => {
                const asserter = await asserters.getCompletions(
                    'imports/top-level-import-exists.st.css',
                    prefix
                );
                asserter.suggested([
                    asserters.importDirectiveCompletion(createRange(11, 0, 11, i))
                ]);
            });
        });

        it('should not complete :import after ::', async () => {
            const asserter = await asserters.getCompletions('imports/top-level-colon-colon.st.css');
            asserter.notSuggested([asserters.importDirectiveCompletion(createRange(0, 0, 0, 0))]);
        });

        it('should not complete :import inside ruleset', async () => {
            const asserter = await asserters.getCompletions('imports/inside-ruleset.st.css');
            asserter.notSuggested([asserters.importDirectiveCompletion(createRange(0, 0, 0, 0))]);
        });

        it('should not complete :import inside media query', async () => {
            const asserter = await asserters.getCompletions('imports/media-query.st.css');
            asserter.notSuggested([asserters.importDirectiveCompletion(createRange(0, 0, 0, 0))]);
        });

        describe('should not complete :import inside selectors', () => {
            [
                'imports/selector.st.css',
                'imports/selector-with-colon.st.css',
                'imports/selector-with-space.st.css',
                'imports/selector-with-colon-space.st.css',
                'imports/before-selector.st.css'
            ].map(src => {
                it('complex rule ' + src.slice(0, src.indexOf('{')), async () => {
                    const asserter = await asserters.getCompletions(src);
                    asserter.notSuggested([
                        asserters.importDirectiveCompletion(createRange(0, 0, 0, 0))
                    ]);
                });
            });
        });
    });
});
