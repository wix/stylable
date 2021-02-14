import { expect } from 'chai';
import { createDiagnostics } from '../../../test-kit/diagnostics-setup';
import * as asserters from '../../../test-kit/completions-asserters';
import { createRange, ProviderRange } from '../../../src/lib/completion-providers';
import { Completion, topLevelDirectives } from '../../../src/lib/completion-types';

const named = ['c1', 'color2', 'part', 'otherPart'];

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

        describe('should complete named parts from .st.css files ', () => {
            for (const name of named) {
                name.split('').map((_c, i) => {
                    const prefix = name.slice(0, i);

                    it('should complete empty named section with Prefix: ' + prefix + ' ', () => {
                        const asserter = asserters.getCompletions(
                            'st-import/inside-empty-named.st.css',
                            prefix
                        );
                        asserter.suggested([
                            asserters.namedCompletion(
                                name,
                                createRange(0, 12, 0, 12 + i),
                                './import.st.css',
                                name === named[0]
                                    ? 'brown'
                                    : name === named[1]
                                    ? 'pink'
                                    : 'Stylable class'
                            ),
                        ]);
                    });

                    it(
                        'should complete empty multiline named section with Prefix: ' +
                            prefix +
                            ' ',
                        () => {
                            const asserter = asserters.getCompletions(
                                'st-import/inside-multiline-empty-named.st.css',
                                prefix
                            );
                            asserter.suggested([
                                asserters.namedCompletion(
                                    name,
                                    createRange(1, 4, 1, 4 + i),
                                    './import.st.css',
                                    name === named[0]
                                        ? 'brown'
                                        : name === named[1]
                                        ? 'pink'
                                        : 'Stylable class'
                                ),
                            ]);
                        }
                    );
                });
            }
        });

        describe('should complete named parts from .js files ', () => {
            const str5 = 'aMixin';
            const str6 = 'aFormatter';

            [str5, str6].forEach((str) => {
                str.split('').forEach((_c, i) => {
                    const prefix = str.slice(0, i);
                    const rng = createRange(0, 12, 0, 12 + i);
                    const path = '../mixins/js-mixins.js';

                    const createComp = (str: string, rng: ProviderRange) =>
                        asserters.namedCompletion(str, rng, path, 'Mixin');
                    it(
                        'Completes names of functions from JS imports, with prefix ' + prefix + ' ',
                        () => {
                            const asserter = asserters.getCompletions(
                                'st-import/named-js.st.css',
                                prefix
                            );
                            const exp: Array<Partial<Completion>> = [];
                            const notExp: Array<Partial<Completion>> = [];
                            if (prefix.length <= 1) {
                                exp.push(createComp(str5, rng));
                                exp.push(createComp(str6, rng));
                            } else {
                                exp.push(createComp(str, rng));
                                notExp.push(createComp(str === str5 ? str6 : str5, rng));
                            }
                            asserter.suggested(exp);
                            asserter.notSuggested(notExp);
                        }
                    );
                });
            });

            [str5, str6].forEach((str) => {
                str.split('').forEach((_c, i) => {
                    const prefix = str.slice(0, i);
                    const rng = createRange(1, 4, 1, 4 + i);
                    const path = '../mixins/js-mixins.js';

                    const createComp = (str: string, rng: ProviderRange) =>
                        asserters.namedCompletion(str, rng, path, 'Mixin');
                    it(
                        'Completes names of functions from JS imports, with prefix ' + prefix + ' ',
                        () => {
                            const asserter = asserters.getCompletions(
                                'st-import/named-js-newline.st.css',
                                prefix
                            );
                            const exp: Array<Partial<Completion>> = [];
                            const notExp: Array<Partial<Completion>> = [];
                            if (prefix.length <= 1) {
                                exp.push(createComp(str5, rng));
                                exp.push(createComp(str6, rng));
                            } else {
                                exp.push(createComp(str, rng));
                                notExp.push(createComp(str === str5 ? str6 : str5, rng));
                            }
                            asserter.suggested(exp);
                            asserter.notSuggested(notExp);
                        }
                    );
                });
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

    it('should not complete :global inside @st-import (default)', () => {
        const asserter = asserters.getCompletions('st-import/inside-multiline-empty-named.st.css');
        asserter.notSuggested([asserters.globalCompletion(createRange(4, 4, 4, 4))]);
    });

    it('should not complete :global inside @st-import (named)', () => {
        const asserter = asserters.getCompletions('st-import/inside-empty-default.st.css');
        asserter.notSuggested([asserters.globalCompletion(createRange(0, 11, 0, 11))]);
    });

    xit('should create cross file errors', () => {
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
