import { createRange } from '@stylable/language-service/dist/lib/completion-providers';
import * as asserters from '../../test-kit/completions-asserters';
import { expect } from 'chai';
import { getCaretOffsetAndCleanContent } from '../../test-kit/asserters';
import { getInMemoryLSP } from '../../test-kit/stylable-in-memory-lsp';

describe('Completions - file system fixtures', () => {
    describe('Stylesheet Top Level', () => {
        const topLevelExistingRange = createRange(3, 0, 3, 0);
        const defaultRange = createRange(0, 0, 0, 0);

        it('should complete ONLY import and vars directive, root and existing classes at top level', () => {
            const asserter = asserters.getCompletions('general/top-level-existing-classes.st.css');
            asserter.suggested([
                asserters.importDirectiveCompletion(topLevelExistingRange),
                asserters.customSelectorDirectiveCompletion(topLevelExistingRange),
                asserters.stScopeDirectiveCompletion(topLevelExistingRange),
                asserters.stGlobalCustomPropertyCompletion(topLevelExistingRange),
                asserters.varsDirectiveCompletion(topLevelExistingRange),
                asserters.rootClassCompletion(topLevelExistingRange),
                asserters.classCompletion('gaga', topLevelExistingRange),
                asserters.classCompletion('baga', topLevelExistingRange),
            ]);
            asserter.notSuggested([
                asserters.statesDirectiveCompletion(defaultRange),
                asserters.extendsDirectiveCompletion(defaultRange),
                asserters.mixinDirectiveCompletion(defaultRange),
            ]);
        });

        it('should not complete broken classes at top level', () => {
            const asserter = asserters.getCompletions(
                'general/top-level-existing-classes-broken.st.css'
            );
            asserter.suggested([
                asserters.importDirectiveCompletion(topLevelExistingRange),
                asserters.customSelectorDirectiveCompletion(topLevelExistingRange),
                asserters.stScopeDirectiveCompletion(topLevelExistingRange),
                asserters.stGlobalCustomPropertyCompletion(topLevelExistingRange),
                asserters.varsDirectiveCompletion(topLevelExistingRange),
                asserters.rootClassCompletion(topLevelExistingRange),
                asserters.classCompletion('gaga', topLevelExistingRange),
            ]);
            asserter.notSuggested([
                asserters.classCompletion('baga', defaultRange),
                asserters.statesDirectiveCompletion(defaultRange),
                asserters.extendsDirectiveCompletion(defaultRange),
                asserters.mixinDirectiveCompletion(defaultRange),
            ]);
        });

        it('should complete root and existing classes at top level after "."', () => {
            const asserter = asserters.getCompletions('general/top-level-dot.st.css');
            asserter.suggested([
                asserters.rootClassCompletion(createRange(0, 0, 0, 1)),
                asserters.classCompletion('gaga', createRange(0, 0, 0, 1)),
            ]);
            asserter.notSuggested([
                asserters.importDirectiveCompletion(defaultRange),
                asserters.statesDirectiveCompletion(defaultRange),
                asserters.extendsDirectiveCompletion(defaultRange),
                asserters.mixinDirectiveCompletion(defaultRange),
                asserters.customSelectorDirectiveCompletion(defaultRange),
                asserters.stScopeDirectiveCompletion(defaultRange),
                asserters.varsDirectiveCompletion(defaultRange),
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
                asserters.statesDirectiveCompletion(defaultRange),
                asserters.extendsDirectiveCompletion(defaultRange),
                asserters.mixinDirectiveCompletion(defaultRange),
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
                asserters.rootClassCompletion(defaultRange),
                asserters.customSelectorDirectiveCompletion(defaultRange),
                asserters.stScopeDirectiveCompletion(defaultRange),
                asserters.varsDirectiveCompletion(defaultRange),
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

describe('Completions - in-memory fixtures', () => {
    const { fs, lsp } = getInMemoryLSP();

    it('should sort stylable completions above css ones', () => {
        const { offset, content } = getCaretOffsetAndCleanContent(`
            .root {
                -st-states: myState;
            }
            
            .root:|
        `);
        fs.populateDirectorySync('/', {
            'index.st.css': content,
        });

        const completions = lsp.onCompletion('/index.st.css', offset);
        const myStateIndex = completions.findIndex((comp) => comp.label === ':myState');
        const hoverIndex = completions.findIndex((comp) => comp.label === ':hover');

        expect(myStateIndex).to.be.lessThan(hoverIndex);
    });
});
