import { createRange, ProviderRange } from '../../../src/lib/completion-providers';
import { Completion } from '../../../src/lib/completion-types';
import * as asserters from '../../../test-kit/completions-asserters';

describe('Custom Selectors', () => {
    describe('Local Selectors', () => {
        const str1 = ':--popo';
        const str2 = ':--pongo';
        const str3 = '::momo';
        const str4 = ':rooroo';
        const str5 = ':state';
        const str6 = ':otherState';
        const createCompletion = (str: string, rng: ProviderRange) =>
            asserters.classCompletion(str, rng, true);

        [str1, str2].forEach((str, j, a) => {
            str.split('').forEach((_c, i) => {
                const prefix = str.slice(0, i);

                it('should be completed at top level, with prefix ' + prefix + ' ', () => {
                    const rng = createRange(10, 0, 10, 0 + i);
                    const asserter = asserters.getCompletions(
                        'custom-selectors/local-selector.st.css',
                        prefix
                    );
                    const exp: Array<Partial<Completion>> = [];
                    const notExp: Array<Partial<Completion>> = [];
                    exp.push(createCompletion(a[j], rng));
                    if (prefix.length <= 5) {
                        exp.push(createCompletion(a[1 - j], rng));
                    } else {
                        notExp.push(createCompletion(a[1 - j], rng));
                    }
                    asserter.suggested(exp);
                    asserter.notSuggested(notExp);
                });

                it('should be completed in complex selectors, with prefix ' + prefix + ' ', () => {
                    const rng = createRange(10, 11, 10, 11 + i);
                    const asserter = asserters.getCompletions(
                        'custom-selectors/local-selector-complex.st.css',
                        prefix
                    );
                    const exp: Array<Partial<Completion>> = [];
                    const notExp: Array<Partial<Completion>> = [];
                    exp.push(createCompletion(a[j], rng));
                    if (prefix.length <= 5) {
                        exp.push(createCompletion(a[1 - j], rng));
                    } else {
                        notExp.push(createCompletion(a[1 - j], rng));
                    }
                    asserter.suggested(exp);
                    asserter.notSuggested(notExp);
                });
            });
        });

        [str3, str4].forEach((str, j, a) => {
            str.split('').forEach((_c, i) => {
                const prefix = str.slice(0, i);
                it(
                    'should have relevant states and pseudo-elements when extending root class, with prefix ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(16, 8, 16, 8 + i);
                        const asserter = asserters.getCompletions(
                            'custom-selectors/local-selector-inner-2.st.css',
                            prefix
                        );
                        const exp: Array<Partial<Completion>> = [];
                        const notExp: Array<Partial<Completion>> = [];
                        exp.push(createCompletion(a[j], rng));
                        if (prefix.length <= 1) {
                            exp.push(createCompletion(a[1 - j], rng));
                        } else {
                            notExp.push(createCompletion(a[1 - j], rng));
                        }
                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    }
                );
            });
        });

        [str5, str6].forEach((str, j, a) => {
            str.split('').forEach((_c, i) => {
                const prefix = str.slice(0, i);
                it(
                    'should have relevant states when extending local class, with prefix ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(16, 8, 16, 8 + i);
                        const asserter = asserters.getCompletions(
                            'custom-selectors/local-selector-inner.st.css',
                            prefix
                        );
                        const exp: Array<Partial<Completion>> = [];
                        const notExp: Array<Partial<Completion>> = [];
                        exp.push(createCompletion(a[j], rng));
                        if (prefix.length <= 1) {
                            exp.push(createCompletion(a[1 - j], rng));
                        } else {
                            notExp.push(createCompletion(a[1 - j], rng));
                        }
                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    }
                );
            });
        });
    });

    describe('Local Selectors with imported type', () => {
        const str1 = ':state';
        const str2 = ':otherState';
        const str3 = '::momo';
        const str4 = '::shlomo';

        [str1, str2].forEach((str, j, a) => {
            str.split('').forEach((_c, i) => {
                const prefix = str.slice(0, i);
                const createCompletion = (str: string, rng: ProviderRange, path: string) =>
                    asserters.stateSelectorCompletion(str.slice(1), rng, path);

                it('should have relevant states, with prefix ' + prefix + ' ', () => {
                    const rng = createRange(10, 8, 10, 8 + i);
                    const asserter = asserters.getCompletions(
                        'pseudo-elements/custom-selector-local.st.css',
                        prefix
                    );
                    const exp: Array<Partial<Completion>> = [];
                    const notExp: Array<Partial<Completion>> = [];
                    exp.push(createCompletion(a[j], rng, './import.st.css'));
                    if (prefix.length <= 1) {
                        exp.push(createCompletion(a[1 - j], rng, './import.st.css'));
                    } else {
                        notExp.push(createCompletion(a[1 - j], rng, './import.st.css'));
                    }
                    asserter.suggested(exp);
                    asserter.notSuggested(notExp);
                });
            });
        });

        [str3, str4].forEach((str, j, a) => {
            str.split('').forEach((_c, i) => {
                const createCompletion = (str: string, rng: ProviderRange, path: string) =>
                    asserters.pseudoElementCompletion(str.slice(2), rng, path);
                const prefix = str.slice(0, i);

                it('should have relevant pseudo-elements, with prefix ' + prefix + ' ', () => {
                    const rng = createRange(10, 8, 10, 8 + i);
                    const asserter = asserters.getCompletions(
                        'pseudo-elements/custom-selector-local.st.css',
                        prefix
                    );
                    const exp: Array<Partial<Completion>> = [];
                    const notExp: Array<Partial<Completion>> = [];
                    exp.push(createCompletion(a[j], rng, './import.st.css'));
                    if (prefix.length <= 2) {
                        exp.push(createCompletion(a[1 - j], rng, './import.st.css'));
                    } else {
                        notExp.push(createCompletion(a[1 - j], rng, './import.st.css'));
                    }
                    asserter.suggested(exp);
                    asserter.notSuggested(notExp);
                });
            });
        });
    });

    describe('Imported Selectors', () => {
        const str1 = '::mongo';
        const str2 = '::pongo';
        const str3 = ':state';
        const str4 = ':otherState';
        const str5 = '::momo';
        const str6 = '::shlomo';
        const createCompletion = (str: string, rng: ProviderRange, path: string) =>
            asserters.pseudoElementCompletion(str.slice(2), rng, path);

        [str1, str2].forEach((str, j, a) => {
            str.split('').forEach((_c, i) => {
                const prefix = str.slice(0, i);

                it(
                    'should be completed at top level after extending class, with prefix ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(9, 5, 9, 5 + i);
                        const asserter = asserters.getCompletions(
                            'custom-selectors/imported-selector-extended.st.css',
                            prefix
                        );
                        const exp: Array<Partial<Completion>> = [];
                        const notExp: Array<Partial<Completion>> = [];
                        exp.push(createCompletion(a[j], rng, './import.st.css'));
                        if (prefix.length <= 2) {
                            exp.push(createCompletion(a[1 - j], rng, './import.st.css'));
                        } else {
                            notExp.push(createCompletion(a[1 - j], rng, './import.st.css'));
                        }
                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    }
                );

                it(
                    'should be completed at top level after extending root class, with prefix ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(9, 5, 9, 5 + i);
                        const asserter = asserters.getCompletions(
                            'custom-selectors/imported-selector-extended-on-root.st.css',
                            prefix
                        );
                        const exp: Array<Partial<Completion>> = [];
                        const notExp: Array<Partial<Completion>> = [];
                        exp.push(createCompletion(a[j], rng, './import.st.css'));
                        if (prefix.length <= 2) {
                            exp.push(createCompletion(a[1 - j], rng, './import.st.css'));
                        } else {
                            notExp.push(createCompletion(a[1 - j], rng, './import.st.css'));
                        }
                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    }
                );

                it(
                    'should be completed at top level after default import as tag, with prefix ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(9, 4, 9, 4 + i);
                        const asserter = asserters.getCompletions(
                            'custom-selectors/imported-selector-as-tag.st.css',
                            prefix
                        );
                        const exp: Array<Partial<Completion>> = [];
                        const notExp: Array<Partial<Completion>> = [];
                        exp.push(createCompletion(a[j], rng, './import.st.css'));
                        if (prefix.length <= 2) {
                            exp.push(createCompletion(a[1 - j], rng, './import.st.css'));
                        } else {
                            notExp.push(createCompletion(a[1 - j], rng, './import.st.css'));
                        }
                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    }
                );
            });
        });

        [str3, str4].forEach((str, j, a) => {
            str.split('').forEach((_c, i) => {
                const prefix = str.slice(0, i);
                const createCompletion = (str: string, rng: ProviderRange, path: string) =>
                    asserters.stateSelectorCompletion(str.slice(1), rng, path);

                it('should have relevant states, with prefix ' + prefix + ' ', () => {
                    const rng = createRange(9, 12, 9, 12 + i);
                    const asserter = asserters.getCompletions(
                        'custom-selectors/imported-selector-inner.st.css',
                        prefix
                    );
                    const exp: Array<Partial<Completion>> = [];
                    const notExp: Array<Partial<Completion>> = [];
                    exp.push(createCompletion(a[j], rng, './top-import.st.css'));
                    if (prefix.length <= 1) {
                        exp.push(createCompletion(a[1 - j], rng, './top-import.st.css'));
                    } else {
                        notExp.push(createCompletion(a[1 - j], rng, './top-import.st.css'));
                    }
                    asserter.suggested(exp);
                    asserter.notSuggested(notExp);
                });

                it('should have relevant states after root, with prefix ' + prefix + ' ', () => {
                    const rng = createRange(9, 12, 9, 12 + i);
                    const asserter = asserters.getCompletions(
                        'custom-selectors/imported-selector-on-root-inner.st.css',
                        prefix
                    );
                    const exp: Array<Partial<Completion>> = [];
                    const notExp: Array<Partial<Completion>> = [];
                    exp.push(createCompletion(a[j], rng, './top-import.st.css'));
                    if (prefix.length <= 1) {
                        exp.push(createCompletion(a[1 - j], rng, './top-import.st.css'));
                    } else {
                        notExp.push(createCompletion(a[1 - j], rng, './top-import.st.css'));
                    }
                    asserter.suggested(exp);
                    asserter.notSuggested(notExp);
                });

                it(
                    'should not have states when custom selector is grouped, with prefix ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(9, 12, 9, 12 + i);
                        const asserter = asserters.getCompletions(
                            'custom-selectors/imported-selector-grouped.st.css',
                            prefix
                        );
                        const notExp: Array<Partial<Completion>> = [];
                        notExp.push(createCompletion(str3, rng, './top-import.st.css'));
                        notExp.push(createCompletion(str4, rng, './top-import.st.css'));
                        asserter.notSuggested(notExp);
                    }
                );
            });
        });

        [str5, str6].forEach((str, j, a) => {
            str.split('').forEach((_c, i) => {
                const createCompletion = (str: string, rng: ProviderRange, path: string) =>
                    asserters.pseudoElementCompletion(str.slice(2), rng, path);
                const prefix = str.slice(0, i);

                it('should have relevant pseudo-elements, with prefix ' + prefix + ' ', () => {
                    const rng = createRange(9, 12, 9, 12 + i);
                    const asserter = asserters.getCompletions(
                        'custom-selectors/imported-selector-inner.st.css',
                        prefix
                    );
                    const exp: Array<Partial<Completion>> = [];
                    const notExp: Array<Partial<Completion>> = [];
                    exp.push(createCompletion(a[j], rng, './top-import.st.css'));
                    if (prefix.length <= 2) {
                        exp.push(createCompletion(a[1 - j], rng, './top-import.st.css'));
                    } else {
                        notExp.push(createCompletion(a[1 - j], rng, './top-import.st.css'));
                    }
                    asserter.suggested(exp);
                    asserter.notSuggested(notExp);
                });

                it(
                    'should have relevant pseudo-elements after root, with prefix ' + prefix + ' ',
                    () => {
                        const rng = createRange(9, 12, 9, 12 + i);
                        const asserter = asserters.getCompletions(
                            'custom-selectors/imported-selector-on-root-inner.st.css',
                            prefix
                        );
                        const exp: Array<Partial<Completion>> = [];
                        const notExp: Array<Partial<Completion>> = [];
                        exp.push(createCompletion(a[j], rng, './top-import.st.css'));
                        if (prefix.length <= 2) {
                            exp.push(createCompletion(a[1 - j], rng, './top-import.st.css'));
                        } else {
                            notExp.push(createCompletion(a[1 - j], rng, './top-import.st.css'));
                        }
                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    }
                );

                it(
                    'should not have pseudo-elements when custom selector is grouped, with prefix ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(9, 12, 9, 12 + i);
                        const asserter = asserters.getCompletions(
                            'custom-selectors/imported-selector-grouped.st.css',
                            prefix
                        );
                        const notExp: Array<Partial<Completion>> = [];
                        notExp.push(createCompletion(str5, rng, './top-import.st.css'));
                        notExp.push(createCompletion(str6, rng, './top-import.st.css'));
                        asserter.notSuggested(notExp);
                    }
                );
            });
        });
    });
});
