import { createRange } from '../../../src/lib/completion-providers';
import * as asserters from '../../../test-kit/completions-asserters';

describe('Completions', () => {
    describe('Stylesheet Top Level', () => {
        it('should complete ONLY import and vars directive, root and existing classes at top level', () => {
            const asserter = asserters.getCompletions('general/top-level-existing-classes.st.css');
            asserter.suggested([
                asserters.importDirectiveCompletion(createRange(3, 0, 3, 0)),
                asserters.customSelectorDirectiveCompletion(createRange(3, 0, 3, 0)),
                asserters.stScopeDirectiveCompletion(createRange(3, 0, 3, 0)),
                asserters.varsDirectiveCompletion(createRange(3, 0, 3, 0)),
                asserters.rootClassCompletion(createRange(3, 0, 3, 0)),
                asserters.classCompletion('gaga', createRange(3, 0, 3, 0)),
                asserters.classCompletion('baga', createRange(3, 0, 3, 0)),
            ]);
            asserter.notSuggested([
                asserters.statesDirectiveCompletion(createRange(0, 0, 0, 0)),
                asserters.extendsDirectiveCompletion(createRange(0, 0, 0, 0)),
                asserters.mixinDirectiveCompletion(createRange(0, 0, 0, 0)),
            ]);
        });

        it('should not complete broken classes at top level', () => {
            const asserter = asserters.getCompletions(
                'general/top-level-existing-classes-broken.st.css'
            );
            asserter.suggested([
                asserters.importDirectiveCompletion(createRange(3, 0, 3, 0)),
                asserters.customSelectorDirectiveCompletion(createRange(3, 0, 3, 0)),
                asserters.stScopeDirectiveCompletion(createRange(3, 0, 3, 0)),
                asserters.varsDirectiveCompletion(createRange(3, 0, 3, 0)),
                asserters.rootClassCompletion(createRange(3, 0, 3, 0)),
                asserters.classCompletion('gaga', createRange(3, 0, 3, 0)),
            ]);
            asserter.notSuggested([
                asserters.classCompletion('baga', createRange(0, 0, 0, 0)),
                asserters.statesDirectiveCompletion(createRange(0, 0, 0, 0)),
                asserters.extendsDirectiveCompletion(createRange(0, 0, 0, 0)),
                asserters.mixinDirectiveCompletion(createRange(0, 0, 0, 0)),
            ]);
        });

        it('should complete root and existing classes at top level after "."', () => {
            const asserter = asserters.getCompletions('general/top-level-dot.st.css');
            asserter.suggested([
                asserters.rootClassCompletion(createRange(0, 0, 0, 1)),
                asserters.classCompletion('gaga', createRange(0, 0, 0, 1)),
            ]);
            asserter.notSuggested([
                asserters.importDirectiveCompletion(createRange(0, 0, 0, 0)),
                asserters.statesDirectiveCompletion(createRange(0, 0, 0, 0)),
                asserters.extendsDirectiveCompletion(createRange(0, 0, 0, 0)),
                asserters.mixinDirectiveCompletion(createRange(0, 0, 0, 0)),
                asserters.customSelectorDirectiveCompletion(createRange(0, 0, 0, 0)),
                asserters.stScopeDirectiveCompletion(createRange(0, 0, 0, 0)),
                asserters.varsDirectiveCompletion(createRange(0, 0, 0, 0)),
            ]);
        });

        it('should complete named imports used locally only once', () => {
            const asserter = asserters.getCompletions('general/top-level-import-and-local.st.css');
            asserter.suggested([
                asserters.rootClassCompletion(createRange(9, 0, 9, 0)),
                asserters.classCompletion('btn', createRange(9, 0, 9, 0)),
                asserters.varsDirectiveCompletion(createRange(9, 0, 9, 0)),
                asserters.importDirectiveCompletion(createRange(9, 0, 9, 0)),
                asserters.namespaceDirectiveCompletion(createRange(9, 0, 9, 0)),
                asserters.customSelectorDirectiveCompletion(createRange(9, 0, 9, 0)),
                asserters.stScopeDirectiveCompletion(createRange(9, 0, 9, 0)),
            ]);
            asserter.notSuggested([
                asserters.statesDirectiveCompletion(createRange(0, 0, 0, 0)),
                asserters.extendsDirectiveCompletion(createRange(0, 0, 0, 0)),
                asserters.mixinDirectiveCompletion(createRange(0, 0, 0, 0)),
            ]);
        });

        it('should complete classes and tags, but not root, in non-initial selector chunks', () => {
            const asserter = asserters.getCompletions('general/non-initial-chunk.st.css');
            asserter.suggested([
                asserters.classCompletion('shlomo', createRange(6, 6, 6, 6)),
                asserters.classCompletion('momo', createRange(6, 6, 6, 6)),
                asserters.classCompletion('Compo', createRange(6, 6, 6, 6), true),
            ]);
            asserter.notSuggested([
                asserters.rootClassCompletion(createRange(0, 0, 0, 0)),
                asserters.customSelectorDirectiveCompletion(createRange(0, 0, 0, 0)),
                asserters.stScopeDirectiveCompletion(createRange(0, 0, 0, 0)),
                asserters.varsDirectiveCompletion(createRange(0, 0, 0, 0)),
            ]);
        });

        it('should not break when no completions to provide', () => {
            return asserters.getCompletions('general/no-completions.st.css');
        });
    });

    describe('Multiple Files', () => {
        it('complete states for localy imported component', () => {
            const asserter = asserters.getCompletions('states/locally-imported-component.st.css');
            asserter.suggested([
                asserters.stateSelectorCompletion(
                    'shmover',
                    createRange(10, 5, 10, 6),
                    './comp-to-import.st.css'
                ),
            ]);
        });

        it('complete states for localy imported component (including local states)', () => {
            const asserter = asserters.getCompletions(
                'states/locally-imported-component-with-states.st.css'
            );
            asserter.suggested([
                asserters.stateSelectorCompletion(
                    'shmover',
                    createRange(11, 5, 11, 6),
                    './comp-to-import.st.css'
                ),
                asserters.stateSelectorCompletion('clover', createRange(11, 5, 11, 6)),
            ]);
        });

        it('complete states for localy imported component ( recursive )', () => {
            const asserter = asserters.getCompletions(
                'states/locally-imported-component-recursive.st.css'
            );
            asserter.suggested([
                asserters.stateSelectorCompletion(
                    'shmover',
                    createRange(11, 11, 11, 12),
                    './comp-to-import.st.css'
                ),
                asserters.stateSelectorCompletion(
                    'hoover',
                    createRange(11, 11, 11, 12),
                    './mid-level-import.st.css'
                ),
                asserters.stateSelectorCompletion('clover', createRange(11, 11, 11, 12)),
            ]);
        });
    });
});
