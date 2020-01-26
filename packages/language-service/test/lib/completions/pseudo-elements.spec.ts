import { createRange, ProviderRange } from '../../../src/lib/completion-providers';
import { Completion } from '../../../src/lib/completion-types';
import * as asserters from '../../../test-kit/completions-asserters';

describe('Pseudo-elements', () => {
    describe('Deafult import used as tag', () => {
        const str1 = '::shlomo';
        const str2 = '::momo';
        const createCompletion = (str: string, rng: ProviderRange) =>
            asserters.pseudoElementCompletion(str.slice(2), rng, './import.st.css');

        [str1, str2].forEach((str, j, a) => {
            str.split('').forEach((_c, i) => {
                const prefix = str.slice(0, i);

                it(
                    'should complete pseudo-element ' +
                        a[j] +
                        ' after class with prefix: ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(6, 4, 6, 4 + i);

                        const asserter = asserters.getCompletions('pseudo-elements/default-import-as-tag.st.css', prefix);
                        const exp: Array<Partial<Completion>> = [];
                        const notExp: Array<Partial<Completion>> = [];
                        exp.push(createCompletion(a[j], rng));
                        if (prefix.length <= 2) {
                            exp.push(createCompletion(a[1 - j], rng));
                        } else {
                            notExp.push(createCompletion(a[1 - j], rng));
                        }
                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    }
                );

                it(
                    'should complete pseudo-element ' +
                        a[j] +
                        ' after CSS state with prefix: ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(9, 10, 9, 10 + i);
                        const asserter = asserters.getCompletions('pseudo-elements/default-import-as-tag-css-state.st.css', prefix);
                        const exp: Array<Partial<Completion>> = [];
                        const notExp: Array<Partial<Completion>> = [];
                        exp.push(createCompletion(a[j], rng));
                        if (prefix.length <= 2) {
                            exp.push(createCompletion(a[1 - j], rng));
                        } else {
                            notExp.push(createCompletion(a[1 - j], rng));
                        }
                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    }
                );

                it(
                    'should complete pseudo-element ' +
                        a[j] +
                        ' after imported state with prefix: ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(9, 10, 9, 10 + i);
                        const asserter = asserters.getCompletions('pseudo-elements/default-import-as-tag-imported-state.st.css', prefix);
                        const exp: Array<Partial<Completion>> = [];
                        const notExp: Array<Partial<Completion>> = [];
                        exp.push(createCompletion(a[j], rng));
                        if (prefix.length <= 2) {
                            exp.push(createCompletion(a[1 - j], rng));
                        } else {
                            notExp.push(createCompletion(a[1 - j], rng));
                        }
                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    }
                );

                it(
                    'should not complete pseudo-element ' +
                        a[j] +
                        ' if a pseudo-element exists with prefix: ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(5, 12, 5, 12 + i);
                        const asserter = asserters.getCompletions('pseudo-elements/default-import-as-tag-pseudo-element-exists.st.css', prefix);

                        const notExp: Array<Partial<Completion>> = [];
                        notExp.push(createCompletion(a[0], rng));
                        notExp.push(createCompletion(a[1], rng));
                        asserter.notSuggested(notExp);
                    }
                );
            });
        });
    });

    describe('Deafult import extended by class', () => {
        const str1 = '::shlomo';
        const str2 = '::momo';
        const createCompletion = (str: string, rng: ProviderRange) =>
            asserters.pseudoElementCompletion(str.slice(2), rng, './import.st.css');

        [str1, str2].forEach((str, j, a) => {
            str.split('').forEach((_c, i) => {
                const prefix = str.slice(0, i);

                it(
                    'should complete pseudo-element ' +
                        a[j] +
                        ' after class with prefix: ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(9, 5, 9, 5 + i);

                        const asserter = asserters.getCompletions('pseudo-elements/default-import-extended.st.css', prefix);
                        const exp: Array<Partial<Completion>> = [];
                        const notExp: Array<Partial<Completion>> = [];
                        exp.push(createCompletion(a[j], rng));
                        if (prefix.length <= 2) {
                            exp.push(createCompletion(a[1 - j], rng));
                        } else {
                            notExp.push(createCompletion(a[1 - j], rng));
                        }
                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    }
                );

                it(
                    'should complete pseudo-element ' +
                        a[j] +
                        ' after local state with prefix: ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(11, 10, 11, 10 + i);
                        const asserter = asserters.getCompletions('pseudo-elements/default-import-extended-local-state.st.css', prefix);
                        const exp: Array<Partial<Completion>> = [];
                        const notExp: Array<Partial<Completion>> = [];
                        exp.push(createCompletion(a[j], rng));
                        if (prefix.length <= 2) {
                            exp.push(createCompletion(a[1 - j], rng));
                        } else {
                            notExp.push(createCompletion(a[1 - j], rng));
                        }
                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    }
                );

                it(
                    'should complete pseudo-element ' +
                        a[j] +
                        ' after CSS state with prefix: ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(10, 12, 10, 12 + i);
                        const asserter = asserters.getCompletions('pseudo-elements/default-import-extended-css-state.st.css', prefix);
                        const exp: Array<Partial<Completion>> = [];
                        const notExp: Array<Partial<Completion>> = [];
                        exp.push(createCompletion(a[j], rng));
                        if (prefix.length <= 2) {
                            exp.push(createCompletion(a[1 - j], rng));
                        } else {
                            notExp.push(createCompletion(a[1 - j], rng));
                        }
                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    }
                );

                it(
                    'should complete pseudo-element ' +
                        a[j] +
                        ' after imported state with prefix: ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(10, 12, 10, 12 + i);
                        const asserter = asserters.getCompletions('pseudo-elements/default-import-extended-imported-state.st.css', prefix);
                        const exp: Array<Partial<Completion>> = [];
                        const notExp: Array<Partial<Completion>> = [];
                        exp.push(createCompletion(a[j], rng));
                        if (prefix.length <= 2) {
                            exp.push(createCompletion(a[1 - j], rng));
                        } else {
                            notExp.push(createCompletion(a[1 - j], rng));
                        }
                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    }
                );

                it(
                    'should not complete pseudo-element ' +
                        a[j] +
                        ' if a pseudo-element exists with prefix: ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(6, 4, 6, 6 + i);
                        const asserter = asserters.getCompletions('pseudo-elements/default-import-extended-pseudo-element-exists.st.css', prefix);
                        const notExp: Array<Partial<Completion>> = [];
                        notExp.push(createCompletion(a[0], rng));
                        notExp.push(createCompletion(a[1], rng));
                        asserter.notSuggested(notExp);
                    }
                );
            });
        });
    });

    describe('Named import extended by class', () => {
        const str1 = '::shlomo';
        const str2 = '::momo';
        const createCompletion = (str: string, rng: ProviderRange) =>
            asserters.pseudoElementCompletion(str.slice(2), rng, './import.st.css');

        [str1, str2].forEach((str, j, a) => {
            str.split('').forEach((_c, i) => {
                const prefix = str.slice(0, i);

                it(
                    'should complete pseudo-element ' +
                        a[j] +
                        ' after class with prefix: ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(10, 5, 10, 5 + i);

                        const asserter = asserters.getCompletions('pseudo-elements/named-import-extended.st.css', prefix);
                        const exp: Array<Partial<Completion>> = [];
                        const notExp: Array<Partial<Completion>> = [];
                        exp.push(createCompletion(a[j], rng));
                        if (prefix.length <= 2) {
                            exp.push(createCompletion(a[1 - j], rng));
                        } else {
                            notExp.push(createCompletion(a[1 - j], rng));
                        }
                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    }
                );

                it(
                    'should complete pseudo-element ' +
                        a[j] +
                        ' after local state with prefix: ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(10, 16, 10, 16 + i);
                        const asserter = asserters.getCompletions('pseudo-elements/named-import-extended-local-state.st.css', prefix);
                        const exp: Array<Partial<Completion>> = [];
                        const notExp: Array<Partial<Completion>> = [];
                        exp.push(createCompletion(a[j], rng));
                        if (prefix.length <= 2) {
                            exp.push(createCompletion(a[1 - j], rng));
                        } else {
                            notExp.push(createCompletion(a[1 - j], rng));
                        }
                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    }
                );

                it(
                    'should complete pseudo-element ' +
                        a[j] +
                        ' after CSS state with prefix: ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(10, 13, 10, 13 + i);
                        const asserter = asserters.getCompletions('pseudo-elements/named-import-extended-css-state.st.css', prefix);
                        const exp: Array<Partial<Completion>> = [];
                        const notExp: Array<Partial<Completion>> = [];
                        exp.push(createCompletion(a[j], rng));
                        if (prefix.length <= 2) {
                            exp.push(createCompletion(a[1 - j], rng));
                        } else {
                            notExp.push(createCompletion(a[1 - j], rng));
                        }
                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    }
                );

                it(
                    'should complete pseudo-element ' +
                        a[j] +
                        ' after imported state with prefix: ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(10, 16, 10, 16 + i);
                        const asserter = asserters.getCompletions('pseudo-elements/named-import-extended-imported-state.st.css', prefix);
                        const exp: Array<Partial<Completion>> = [];
                        const notExp: Array<Partial<Completion>> = [];
                        exp.push(createCompletion(a[j], rng));
                        if (prefix.length <= 2) {
                            exp.push(createCompletion(a[1 - j], rng));
                        } else {
                            notExp.push(createCompletion(a[1 - j], rng));
                        }
                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    }
                );

                it(
                    'should not complete pseudo-element ' +
                        a[j] +
                        ' if a pseudo-element exists with prefix: ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(6, 4, 6, 6 + i);
                        const asserter = asserters.getCompletions('pseudo-elements/default-import-extended-pseudo-element-exists.st.css', prefix);
                        const notExp: Array<Partial<Completion>> = [];
                        notExp.push(createCompletion(a[0], rng));
                        notExp.push(createCompletion(a[1], rng));
                        asserter.notSuggested(notExp);
                    }
                );
            });
        });

        it('should not complete root pseudo-elements on class extending named import', () => {
            const asserter = asserters.getCompletions('pseudo-elements/named-import-extended.st.css');
            asserter.notSuggested([
                asserters.pseudoElementCompletion(
                    'bobo',
                    createRange(9, 5, 9, 5),
                    './import.st.css'
                )
            ]);
        });
    });

    describe('Recursive imports', () => {
        const str1 = '::shlomo';
        const str2 = '::momo';
        const createCompletion = (str: string, rng: ProviderRange) =>
            asserters.pseudoElementCompletion(str.slice(2), rng, './recursive-import-1.st.css');

        [str1, str2].forEach((str, j, a) => {
            str.split('').forEach((_c, i) => {
                const prefix = str.slice(0, i);

                it(
                    'should complete pseudo-element ' +
                        str +
                        ' after pseudo-element with prefix: ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(10, 11, 10, 11 + i);

                        const asserter = asserters.getCompletions('pseudo-elements/recursive-import-3.st.css', prefix);
                        const exp: Array<Partial<Completion>> = [];
                        const notExp: Array<Partial<Completion>> = [];
                        exp.push(createCompletion(a[j], rng));
                        if (prefix.length <= 2) {
                            exp.push(createCompletion(a[1 - j], rng));
                        } else {
                            notExp.push(createCompletion(a[1 - j], rng));
                        }
                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    }
                );

                it(
                    'should complete pseudo-element ' +
                        str +
                        ' after pseudo-element when line has leading spaces, with prefix: ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(10, 12, 10, 12 + i);

                        const asserter = asserters.getCompletions('pseudo-elements/recursive-import-3-leading-space.st.css', prefix);
                        const exp: Array<Partial<Completion>> = [];
                        const notExp: Array<Partial<Completion>> = [];
                        exp.push(createCompletion(a[j], rng));
                        if (prefix.length <= 2) {
                            exp.push(createCompletion(a[1 - j], rng));
                        } else {
                            notExp.push(createCompletion(a[1 - j], rng));
                        }
                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    }
                );

                it(
                    'should complete pseudo-element ' +
                        str +
                        ' after CSS state with prefix: ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(10, 16, 10, 16 + i);
                        const asserter = asserters.getCompletions('pseudo-elements/recursive-import-3-css-state.st.css', prefix);
                        const exp: Array<Partial<Completion>> = [];
                        const notExp: Array<Partial<Completion>> = [];
                        exp.push(createCompletion(a[j], rng));
                        if (prefix.length <= 2) {
                            exp.push(createCompletion(a[1 - j], rng));
                        } else {
                            notExp.push(createCompletion(a[1 - j], rng));
                        }
                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    }
                );

                it(
                    'should complete pseudo-element ' +
                        a[j] +
                        ' after imported state with prefix: ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(10, 17, 10, 17 + i);
                        const asserter = asserters.getCompletions('pseudo-elements/recursive-import-3-imported-state.st.css', prefix);
                        const exp: Array<Partial<Completion>> = [];
                        const notExp: Array<Partial<Completion>> = [];
                        exp.push(createCompletion(a[j], rng));
                        if (prefix.length <= 2) {
                            exp.push(createCompletion(a[1 - j], rng));
                        } else {
                            notExp.push(createCompletion(a[1 - j], rng));
                        }
                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    }
                );

                it(
                    'should not complete pseudo-element ' +
                        a[j] +
                        ' if a pseudo-element exists with prefix: ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(0, 0, 0, 0);
                        const asserter = asserters.getCompletions('pseudo-elements/recursive-import-3-pseudo-element-exists.st.css', prefix);
                        const notExp: Array<Partial<Completion>> = [];
                        notExp.push(createCompletion(a[0], rng));
                        notExp.push(createCompletion(a[1], rng));
                        asserter.notSuggested(notExp);
                    }
                );
            });
        });
    });

    describe('Deep Recursive imports', () => {
        const str = '::momi';
        const nonos = ['::momo', '::bobo', '::shlomo'];
        let createCompletion = (str: string, rng: ProviderRange) =>
            asserters.pseudoElementCompletion(str.slice(2), rng, './recursive-import-0.st.css');

        str.split('').forEach((_c, i) => {
            const rng = createRange(10, 39, 10, 39 + i);
            const prefix = str.slice(0, i);

            it(
                'should complete pseudo-element ' +
                    str +
                    ' in deep chain with prefix: ' +
                    prefix +
                    ' ',
                () => {
                    const asserter = asserters.getCompletions('pseudo-elements/recursive-import-3-deep.st.css', prefix);
                    const exp: Array<Partial<Completion>> = [];
                    const notExp: Array<Partial<Completion>> = [];
                    exp.push(createCompletion(str, rng));
                    nonos.forEach(nono => notExp.push(createCompletion(nono, rng)));
                    asserter.suggested(exp);
                    asserter.notSuggested(notExp);
                }
            );
        });

        const str1 = ':oompa';
        const nonos1 = [':state', ':otherState', ':lala', ':loompa'];
        createCompletion = (str: string, rng: ProviderRange) =>
            asserters.stateSelectorCompletion(
                str.slice(1),
                rng,
                str === str1 ? './recursive-import-0.st.css' : './recursive-import-0.st.css'
            );

        str1.split('').forEach((_c, i) => {
            const prefix = '::momi' + str1.slice(0, i);
            const rng = createRange(10, 45, 10, 39 + prefix.length);

            it(
                'should complete state ' + str1 + ' in deep chain with prefix: ' + prefix + ' ',
                () => {
                    const asserter = asserters.getCompletions('pseudo-elements/recursive-import-3-deep.st.css', prefix);
                    const exp: Array<Partial<Completion>> = [];
                    const notExp: Array<Partial<Completion>> = [];
                    exp.push(createCompletion(str1, rng));
                    nonos1.forEach(nono => notExp.push(createCompletion(nono, rng)));
                    asserter.suggested(exp);
                    asserter.notSuggested(notExp);
                }
            );
        });
    });

    describe('After CSS native elements', () => {
        const str = '::momo';
        const createCompletion = (str: string, rng: ProviderRange) =>
            asserters.pseudoElementCompletion(str.slice(2), rng, './import.st.css');

        str.split('').forEach((_c, i) => {
            const prefix = str.slice(0, i);

            it(
                'should complete pseudo-element ' +
                    str +
                    ' after CSS native pseudo-element with prefix: ' +
                    prefix +
                    ' ',
                () => {
                    const rng = createRange(9, 14, 9, 14 + i);

                    const asserter = asserters.getCompletions('pseudo-elements/default-import-with-native-element.st.css', prefix);
                    const exp: Array<Partial<Completion>> = [];
                    exp.push(createCompletion(str, rng));
                    asserter.suggested(exp);
                }
            );

            it(
                'should complete pseudo-element ' +
                    str +
                    ' after CSS native pseudo-class with prefix: ' +
                    prefix +
                    ' ',
                () => {
                    const rng = createRange(9, 12, 9, 12 + i);

                    const asserter = asserters.getCompletions('pseudo-elements/default-import-with-native-class.st.css', prefix);
                    const exp: Array<Partial<Completion>> = [];
                    exp.push(createCompletion(str, rng));
                    asserter.suggested(exp);
                }
            );
        });
    });
});
