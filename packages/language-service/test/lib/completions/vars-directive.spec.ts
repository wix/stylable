import { createRange } from '../../../src/lib/completion-providers';
import { topLevelDirectives } from '../../../src/lib/completion-types';
import * as asserters from '../../../test-kit/completions-asserters';

describe('Variables Directive', () => {
    describe('should complete :vars at top level ', () => {
        topLevelDirectives.vars.split('').map((_c, i) => {
            const prefix = topLevelDirectives.vars.slice(0, i);
            it("when it doesn't exist, with prefix: " + prefix + ' ', async () => {
                const asserter = await asserters.getCompletions('imports/top-level.st.css', prefix);
                asserter.suggested([asserters.varsDirectiveCompletion(createRange(0, 0, 0, i))]);
            });
        });

        topLevelDirectives.vars.split('').map((_c, i) => {
            const prefix = topLevelDirectives.vars.slice(0, i);
            it('when it exists, with prefix: ' + prefix + ' ', async () => {
                const asserter = await asserters.getCompletions(
                    'imports/top-level-import-exists.st.css',
                    prefix
                );
                asserter.suggested([asserters.varsDirectiveCompletion(createRange(11, 0, 11, i))]);
            });
        });
    });

    it('should not complete :vars after ::', async () => {
        const asserter = await asserters.getCompletions('imports/top-level-colon-colon.st.css');
        asserter.notSuggested([asserters.varsDirectiveCompletion(createRange(0, 0, 0, 0))]);
    });

    it('should not complete :vars inside rulesets', async () => {
        const asserter = await asserters.getCompletions('imports/inside-ruleset.st.css');
        asserter.suggested([]);
        asserter.notSuggested([asserters.varsDirectiveCompletion(createRange(0, 0, 0, 0))]);
    });

    it('should not complete :vars inside media query', async () => {
        const asserter = await asserters.getCompletions('imports/media-query.st.css');
        asserter.suggested([]);
        asserter.notSuggested([asserters.varsDirectiveCompletion(createRange(0, 0, 0, 0))]);
    });
});
