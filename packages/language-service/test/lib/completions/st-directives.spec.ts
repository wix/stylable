import { createRange } from '../../../src/lib/completion-providers';
import { importDirectives, rulesetDirectives } from '../../../src/lib/completion-types';
import * as asserters from '../../../test-kit/completions-asserters';

describe('Inner Directives', () => {
    describe('should complete -st-from inside import selector ', () => {
        importDirectives.from.split('').map((_c: string, i: number) => {
            const prefix = importDirectives.from.slice(0, i);
            it(' with Prefix: ' + prefix + ' ', async () => {
                const asserter = await asserters.getCompletions(
                    'imports/inside-import-selector.st.css',
                    prefix
                );
                asserter.suggested([
                    asserters.importFromDirectiveCompletion(createRange(2, 4, 2, 4 + i))
                ]);
            });
        });
    });

    describe('should complete -st-default inside import selector ', () => {
        importDirectives.default.split('').map((_c: string, i: number) => {
            const prefix = importDirectives.default.slice(0, i);
            it(' with Prefix: ' + prefix + ' ', async () => {
                const asserter = await asserters.getCompletions(
                    'imports/inside-import-selector.st.css',
                    prefix
                );
                asserter.suggested([
                    asserters.importDefaultDirectiveCompletion(createRange(2, 4, 2, 4 + i))
                ]);
            });
        });
    });

    describe('should complete -st-named inside import selector ', () => {
        importDirectives.named.split('').map((_c: string, i: number) => {
            const prefix = importDirectives.named.slice(0, i);
            it(' with Prefix: ' + prefix + ' ', async () => {
                const asserter = await asserters.getCompletions(
                    'imports/inside-import-selector.st.css',
                    prefix
                );
                asserter.suggested([
                    asserters.importNamedDirectiveCompletion(createRange(2, 4, 2, 4 + i))
                ]);
            });
        });
    });

    it('should not complete -st-from, -st-default, -st-named inside import directives when exists', async () => {
        const asserter = await asserters.getCompletions(
            'imports/inside-import-selector-with-fields.st.css'
        );
        asserter.notSuggested([
            asserters.importFromDirectiveCompletion(createRange(0, 0, 0, 0)),
            asserters.importDefaultDirectiveCompletion(createRange(0, 0, 0, 0)),
            asserters.importNamedDirectiveCompletion(createRange(0, 0, 0, 0))
        ]);
    });

    it('should not complete -st-from, -st-default, -st-named outisde the import ruleset', async () => {
        const asserter = await asserters.getCompletions('imports/outside-ruleset.st.css');
        asserter.notSuggested([
            asserters.importFromDirectiveCompletion(createRange(0, 0, 0, 0)),
            asserters.importDefaultDirectiveCompletion(createRange(0, 0, 0, 0)),
            asserters.importNamedDirectiveCompletion(createRange(0, 0, 0, 0))
        ]);
    });

    describe('should complete -st-states inside simple selector ruleset ', () => {
        rulesetDirectives.states.split('').map((_c: string, i: number) => {
            const prefix = rulesetDirectives.states.slice(0, i);
            it(' with Prefix: ' + prefix + ' ', async () => {
                const asserter = await asserters.getCompletions(
                    'imports/inside-ruleset.st.css',
                    prefix
                );
                asserter.suggested([
                    asserters.statesDirectiveCompletion(createRange(2, 4, 2, 4 + i))
                ]);
            });
        });
    });

    describe('should complete -st-extends inside simple selector ruleset ', () => {
        rulesetDirectives.extends.split('').map((_c: string, i: number) => {
            const prefix = rulesetDirectives.extends.slice(0, i);
            it(' with Prefix: ' + prefix + ' ', async () => {
                const asserter = await asserters.getCompletions(
                    'imports/inside-ruleset.st.css',
                    prefix
                );
                asserter.suggested([
                    asserters.extendsDirectiveCompletion(createRange(2, 4, 2, 4 + i))
                ]);
            });
        });
    });

    describe('should complete -st-mixin inside simple selector ruleset ', () => {
        rulesetDirectives.mixin.split('').map((_c: string, i: number) => {
            const prefix = rulesetDirectives.mixin.slice(0, i);
            it(' with Prefix: ' + prefix + ' ', async () => {
                const asserter = await asserters.getCompletions(
                    'imports/inside-ruleset.st.css',
                    prefix
                );
                asserter.suggested([
                    asserters.mixinDirectiveCompletion(createRange(2, 4, 2, 4 + i))
                ]);
            });
        });
    });

    // tslint:disable-next-line: max-line-length
    it('should not complete -st-states, -st-extends, -st-mixin inside simple selector ruleset when they exist', async () => {
        const asserter = await asserters.getCompletions(
            'general/inside-simple-ruleset-with-all-st-fields.st.css'
        );
        asserter.notSuggested([
            asserters.statesDirectiveCompletion(createRange(0, 0, 0, 0)),
            asserters.extendsDirectiveCompletion(createRange(0, 0, 0, 0)),
            asserters.mixinDirectiveCompletion(createRange(0, 0, 0, 0))
        ]);
    });

    it('should complete -st-mixin, but not -st-states, -st-extends inside media query', async () => {
        const asserter = await asserters.getCompletions('complex-selectors/media-query.st.css');
        asserter.suggested([asserters.mixinDirectiveCompletion(createRange(2, 8, 2, 8))]);
        asserter.notSuggested([
            asserters.statesDirectiveCompletion(createRange(0, 0, 0, 0)),
            asserters.extendsDirectiveCompletion(createRange(0, 0, 0, 0))
        ]);
    });

    describe('should complete -st-mixin, but not -st-states, -st-extends inside complex rules', () => {
        [
            'complex-selectors/class-and-class.st.css',
            'complex-selectors/class-and-descendant.st.css',
            'complex-selectors/class-and-tag.st.css',
            'complex-selectors/tag-and-class.st.css',
            'complex-selectors/class-and-state.st.css'
        ].map(src => {
            it('complex rule ' + src.slice(0, src.indexOf('{')), async () => {
                const asserter = await asserters.getCompletions(src);
                asserter.suggested([asserters.mixinDirectiveCompletion(createRange(1, 4, 1, 4))]);
                asserter.notSuggested([
                    asserters.statesDirectiveCompletion(createRange(0, 0, 0, 0)),
                    asserters.extendsDirectiveCompletion(createRange(0, 0, 0, 0))
                ]);
            });
        });
    });
});
