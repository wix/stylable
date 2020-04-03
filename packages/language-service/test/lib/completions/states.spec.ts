import { createRange, ProviderRange } from '../../../src/lib/completion-providers';
import { Completion } from '../../../src/lib/completion-types';
import * as asserters from '../../../test-kit/completions-asserters';

describe('States', () => {
    describe('Local states', () => {
        const str1 = ':hello';
        const str2 = ':goodbye';
        const str3 = ':holla';
        const createCompletion = (str: string, rng: ProviderRange, path?: string) =>
            asserters.stateSelectorCompletion(str.slice(1), rng, path);

        [str1, str2].forEach((str, j, a) => {
            str.split('').forEach((_c, i) => {
                const prefix = str.slice(0, i);

                it(
                    'should complete available states from same file, with prefix ' + prefix + ' ',
                    () => {
                        const rng = createRange(4, 5, 4, 5 + i);
                        const asserter = asserters.getCompletions(
                            'states/class-with-states.st.css',
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

                it(
                    'should complete available states in complex selectors, with prefix ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(9, 19, 9, 19 + i);
                        const asserter = asserters.getCompletions(
                            'states/complex-selectors.st.css',
                            prefix
                        );
                        const exp: Array<Partial<Completion>> = [];
                        const notExp: Array<Partial<Completion>> = [];
                        if (str === str1) {
                            exp.push(createCompletion(str1, rng));
                        } else if (prefix.length <= 1) {
                            exp.push(createCompletion(str1, rng));
                        }
                        notExp.push(createCompletion(str2, rng));
                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    }
                );
            });
        });

        [str1, str3].forEach((str) => {
            str.split('').forEach((_c, i) => {
                const prefix = str.slice(0, i);

                it(
                    'should complete only unused states in complex selectors ending in state name, with prefix ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(9, 25, 9, 25 + i);
                        const asserter = asserters.getCompletions(
                            'states/complex-selectors-with-states.st.css',
                            prefix
                        );
                        const exp: Array<Partial<Completion>> = [];
                        const notExp: Array<Partial<Completion>> = [];
                        if (str === str1) {
                            exp.push(createCompletion(str1, rng));
                        } else if (prefix.length <= 2) {
                            exp.push(createCompletion(str1, rng));
                        }
                        notExp.push(createCompletion(str3, rng));
                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    }
                );
            });
        });

        it('should not complete state value after :: ', () => {
            const asserter = asserters.getCompletions(
                'states/class-with-states-double-colon.st.css'
            );
            asserter.notSuggested([
                asserters.stateSelectorCompletion('hello', createRange(0, 0, 0, 0)),
                asserters.stateSelectorCompletion('goodbye', createRange(0, 0, 0, 0)),
            ]);
        });
    });

    describe('State with param', () => {
        describe('Definition', () => {
            it('should complete available states param types', () => {
                const rng = createRange(1, 22, 1, 22);
                const createCompletion = (str: string, rng: ProviderRange, path?: string) =>
                    asserters.stateTypeDefinitionCompletion(str, rng, path);

                const asserter = asserters.getCompletions(
                    'states/with-param/state-def-with-param-start.st.css'
                );
                const exp: Array<Partial<Completion>> = [];
                exp.push(createCompletion('string', rng));
                exp.push(createCompletion('number', rng));
                exp.push(createCompletion('enum', rng));
                exp.push(createCompletion('tag', rng));
                asserter.suggested(exp);
            });

            describe('String', () => {
                it('should complete available state with the start of a "string" pre-written', () => {
                    const rng = createRange(1, 22, 1, 23);
                    const createCompletion = (str: string, rng: ProviderRange, path?: string) =>
                        asserters.stateTypeDefinitionCompletion(str, rng, path);

                    const asserter = asserters.getCompletions(
                        'states/with-param/string/state-def-with-param-string-start.st.css'
                    );
                    const exp: Array<Partial<Completion>> = [];
                    const unExp: Array<Partial<Completion>> = [];
                    exp.push(createCompletion('string', rng));
                    unExp.push(createCompletion('number', rng));
                    unExp.push(createCompletion('enum', rng));
                    unExp.push(createCompletion('tag', rng));
                    asserter.suggested(exp);
                    asserter.notSuggested(unExp);
                });

                describe('Validators', () => {
                    it('should complete available state string validators', () => {
                        const rng = createRange(1, 29, 1, 29);
                        const createCompletion = (
                            validator: string,
                            rng: ProviderRange,
                            type: string,
                            path?: string
                        ) =>
                            asserters.stateValidatorDefinitionCompletion(
                                validator,
                                rng,
                                type,
                                path
                            );

                        const asserter = asserters.getCompletions(
                            'states/with-param/string/local-state-string-validators.st.css'
                        );
                        const exp: Array<Partial<Completion>> = [];
                        exp.push(createCompletion('regex', rng, 'string'));
                        exp.push(createCompletion('contains', rng, 'string'));
                        exp.push(createCompletion('minLength', rng, 'string'));
                        exp.push(createCompletion('maxLength', rng, 'string'));
                        asserter.suggested(exp);
                    });

                    it('should complete regex string validator', () => {
                        const rng = createRange(1, 29, 1, 31);
                        const createCompletion = (
                            validator: string,
                            rng: ProviderRange,
                            type: string,
                            path?: string
                        ) =>
                            asserters.stateValidatorDefinitionCompletion(
                                validator,
                                rng,
                                type,
                                path
                            );

                        const asserter = asserters.getCompletions(
                            'states/with-param/string/state-def-with-param-string-regex-start.st.css'
                        );
                        const exp: Array<Partial<Completion>> = [];
                        const unExp: Array<Partial<Completion>> = [];
                        exp.push(createCompletion('regex', rng, 'string'));
                        unExp.push(createCompletion('contains', rng, 'string'));
                        unExp.push(createCompletion('minLength', rng, 'string'));
                        unExp.push(createCompletion('maxLength', rng, 'string'));
                        asserter.suggested(exp);
                        asserter.notSuggested(unExp);
                    });

                    it('should complete contains string validator', () => {
                        const rng = createRange(1, 29, 1, 30);
                        const createCompletion = (
                            validator: string,
                            rng: ProviderRange,
                            type: string,
                            path?: string
                        ) =>
                            asserters.stateValidatorDefinitionCompletion(
                                validator,
                                rng,
                                type,
                                path
                            );

                        const asserter = asserters.getCompletions(
                            'states/with-param/string/state-def-with-param-string-contains-start.st.css'
                        );
                        const exp: Array<Partial<Completion>> = [];
                        const unExp: Array<Partial<Completion>> = [];
                        exp.push(createCompletion('contains', rng, 'string'));
                        unExp.push(createCompletion('regex', rng, 'string'));
                        unExp.push(createCompletion('minLength', rng, 'string'));
                        unExp.push(createCompletion('maxLength', rng, 'string'));
                        asserter.suggested(exp);
                        asserter.notSuggested(unExp);
                    });

                    it('should complete min/max Length string validators', () => {
                        const rng = createRange(1, 29, 1, 30);
                        const createCompletion = (
                            validator: string,
                            rng: ProviderRange,
                            type: string,
                            path?: string
                        ) =>
                            asserters.stateValidatorDefinitionCompletion(
                                validator,
                                rng,
                                type,
                                path
                            );

                        const asserter = asserters.getCompletions(
                            'states/with-param/string/state-def-with-param-string-m-start.st.css'
                        );
                        const exp: Array<Partial<Completion>> = [];
                        const unExp: Array<Partial<Completion>> = [];
                        exp.push(createCompletion('minLength', rng, 'string'));
                        exp.push(createCompletion('maxLength', rng, 'string'));
                        unExp.push(createCompletion('regex', rng, 'string'));
                        unExp.push(createCompletion('contains', rng, 'string'));
                        asserter.suggested(exp);
                        asserter.notSuggested(unExp);
                    });
                });
            });
            describe('Number', () => {
                it('should complete available state with the start of a "number" pre-written', () => {
                    const rng = createRange(1, 22, 1, 23);
                    const createCompletion = (str: string, rng: ProviderRange, path?: string) =>
                        asserters.stateTypeDefinitionCompletion(str, rng, path);

                    const asserter = asserters.getCompletions(
                        'states/with-param/number/state-def-with-param-number-start.st.css'
                    );
                    const exp: Array<Partial<Completion>> = [];
                    const unExp: Array<Partial<Completion>> = [];
                    exp.push(createCompletion('number', rng));
                    unExp.push(createCompletion('string', rng));
                    unExp.push(createCompletion('enum', rng));
                    unExp.push(createCompletion('tag', rng));
                    asserter.suggested(exp);
                    asserter.notSuggested(unExp);
                });

                describe('Validators', () => {
                    it('should complete available state number validators', () => {
                        const rng = createRange(1, 29, 1, 29);
                        const createCompletion = (
                            validator: string,
                            rng: ProviderRange,
                            type: string,
                            path?: string
                        ) =>
                            asserters.stateValidatorDefinitionCompletion(
                                validator,
                                rng,
                                type,
                                path
                            );

                        const asserter = asserters.getCompletions(
                            'states/with-param/number/local-state-number-validators.st.css'
                        );
                        const exp: Array<Partial<Completion>> = [];
                        exp.push(createCompletion('min', rng, 'number'));
                        exp.push(createCompletion('max', rng, 'number'));
                        exp.push(createCompletion('multipleOf', rng, 'number'));
                        asserter.suggested(exp);
                    });

                    it('should complete min number validator', () => {
                        const rng = createRange(1, 29, 1, 31);
                        const createCompletion = (
                            validator: string,
                            rng: ProviderRange,
                            type: string,
                            path?: string
                        ) =>
                            asserters.stateValidatorDefinitionCompletion(
                                validator,
                                rng,
                                type,
                                path
                            );

                        const asserter = asserters.getCompletions(
                            'states/with-param/number/state-def-with-param-number-min-start.st.css'
                        );
                        const exp: Array<Partial<Completion>> = [];
                        const unExp: Array<Partial<Completion>> = [];
                        exp.push(createCompletion('min', rng, 'number'));
                        unExp.push(createCompletion('max', rng, 'number'));
                        unExp.push(createCompletion('multipleOf', rng, 'number'));
                        asserter.suggested(exp);
                        asserter.notSuggested(unExp);
                    });

                    it('should complete max number validator', () => {
                        const rng = createRange(1, 29, 1, 31);
                        const createCompletion = (
                            validator: string,
                            rng: ProviderRange,
                            type: string,
                            path?: string
                        ) =>
                            asserters.stateValidatorDefinitionCompletion(
                                validator,
                                rng,
                                type,
                                path
                            );

                        const asserter = asserters.getCompletions(
                            'states/with-param/number/state-def-with-param-number-max-start.st.css'
                        );
                        const exp: Array<Partial<Completion>> = [];
                        const unExp: Array<Partial<Completion>> = [];
                        exp.push(createCompletion('max', rng, 'number'));
                        unExp.push(createCompletion('min', rng, 'number'));
                        unExp.push(createCompletion('multipleOf', rng, 'number'));
                        asserter.suggested(exp);
                        asserter.notSuggested(unExp);
                    });

                    it('should complete multipleOf number validator', () => {
                        const rng = createRange(1, 29, 1, 31);
                        const createCompletion = (
                            validator: string,
                            rng: ProviderRange,
                            type: string,
                            path?: string
                        ) =>
                            asserters.stateValidatorDefinitionCompletion(
                                validator,
                                rng,
                                type,
                                path
                            );

                        const asserter = asserters.getCompletions(
                            'states/with-param/number/state-def-with-param-number-multiple-start.st.css'
                        );
                        const exp: Array<Partial<Completion>> = [];
                        const unExp: Array<Partial<Completion>> = [];
                        exp.push(createCompletion('multipleOf', rng, 'number'));
                        unExp.push(createCompletion('min', rng, 'number'));
                        unExp.push(createCompletion('max', rng, 'number'));
                        asserter.suggested(exp);
                        asserter.notSuggested(unExp);
                    });
                });
            });

            describe('Enum', () => {
                it('should complete available state with the start of a "enum" pre-written', () => {
                    const rng = createRange(1, 22, 1, 23);
                    const createCompletion = (str: string, rng: ProviderRange, path?: string) =>
                        asserters.stateTypeDefinitionCompletion(str, rng, path);

                    const asserter = asserters.getCompletions(
                        'states/with-param/enum/state-def-with-param-enum-start.st.css'
                    );
                    const exp: Array<Partial<Completion>> = [];
                    const unExp: Array<Partial<Completion>> = [];
                    exp.push(createCompletion('enum', rng));
                    unExp.push(createCompletion('number', rng));
                    unExp.push(createCompletion('tag', rng));
                    unExp.push(createCompletion('string', rng));
                    asserter.suggested(exp);
                    asserter.notSuggested(unExp);
                });
            });

            describe('Tag', () => {
                it('should complete available state with the start of a "tag" pre-written', () => {
                    const rng = createRange(1, 22, 1, 23);
                    const createCompletion = (str: string, rng: ProviderRange, path?: string) =>
                        asserters.stateTypeDefinitionCompletion(str, rng, path);

                    const asserter = asserters.getCompletions(
                        'states/with-param/tag/state-def-with-param-tag-start.st.css'
                    );
                    const exp: Array<Partial<Completion>> = [];
                    const unExp: Array<Partial<Completion>> = [];
                    exp.push(createCompletion('tag', rng));
                    unExp.push(createCompletion('number', rng));
                    unExp.push(createCompletion('enum', rng));
                    unExp.push(createCompletion('string', rng));
                    asserter.suggested(exp);
                    asserter.notSuggested(unExp);
                });
            });
        });

        describe('Usage', () => {
            it('should complete available states from same file (with parenthesis)', () => {
                const rng = createRange(4, 5, 4, 5);
                const createCompletion = (str: string, rng: ProviderRange, path?: string) =>
                    asserters.stateSelectorCompletion(str.slice(1), rng, path, true);

                const asserter = asserters.getCompletions(
                    'states/with-param/local-state-param.st.css'
                );
                const exp: Array<Partial<Completion>> = [];
                exp.push(createCompletion(':hello', rng));
                asserter.suggested(exp);
            });

            it('should complete imported state (with parenthesis)', () => {
                const rng = createRange(9, 5, 9, 5);
                const createCompletion = (str: string, rng: ProviderRange, path?: string) =>
                    asserters.stateSelectorCompletion(str.slice(1), rng, path, true);

                const asserter = asserters.getCompletions(
                    'states/with-param/imported-state-param.st.css'
                );
                const exp: Array<Partial<Completion>> = [];
                exp.push(createCompletion(':shmover', rng, './comp-to-import-with-param.st.css'));
                asserter.suggested(exp);
            });

            it('should complete enum state parameter options', () => {
                const rng = createRange(4, 12, 4, 12);
                const createCompletion = (str: string, rng: ProviderRange, path?: string) =>
                    asserters.stateEnumCompletion(str, rng, path);

                const asserter = asserters.getCompletions(
                    'states/with-param/enum/state-with-param-enum-suggestion.st.css'
                );
                const exp: Array<Partial<Completion>> = [];
                exp.push(createCompletion('bob', rng));
                exp.push(createCompletion('alice', rng));
                exp.push(createCompletion('eve', rng));
                asserter.suggested(exp);
            });

            it('should complete pre-existing enum state parameter options from imported file', () => {
                const rng = createRange(9, 12, 9, 13);
                const createCompletion = (str: string, rng: ProviderRange, path?: string) =>
                    asserters.stateEnumCompletion(str, rng, path);

                const asserter = asserters.getCompletions(
                    'states/with-param/enum/imported-state-with-enum-middle.st.css'
                );
                const exp: Array<Partial<Completion>> = [];
                const unExp: Array<Partial<Completion>> = [];
                exp.push(createCompletion('eve', rng, './state-with-enum.st.css'));
                unExp.push(createCompletion('alice', rng, './state-with-enum.st.css'));
                unExp.push(createCompletion('bob', rng, './state-with-enum.st.css'));
                asserter.suggested(exp);
                asserter.notSuggested(unExp);
            });

            it('should not complete pseudo-states and pseudo-elements when inside an enum (from imported file)', () => {
                const rng = createRange(9, 12, 9, 12);
                const createEnumComp = (str: string, rng: ProviderRange, path?: string) =>
                    asserters.stateEnumCompletion(str, rng, path);
                const createStateComp = (str: string, rng: ProviderRange, path?: string) =>
                    asserters.stateSelectorCompletion(str, rng, path);
                const createElementComp = (str: string, rng: ProviderRange, path?: string) =>
                    asserters.pseudoElementCompletion(str, rng, path);
                const createGlobalComp = (rng: ProviderRange) => asserters.globalCompletion(rng);

                const asserter = asserters.getCompletions(
                    'states/with-param/enum/imported-state-with-enum-start.st.css'
                );
                const exp: Array<Partial<Completion>> = [];
                const unExp: Array<Partial<Completion>> = [];
                exp.push(createEnumComp('eve', rng, './state-with-enum.st.css'));
                exp.push(createEnumComp('alice', rng, './state-with-enum.st.css'));
                exp.push(createEnumComp('bob', rng, './state-with-enum.st.css'));
                unExp.push(createStateComp('otherState', rng, './state-with-enum.st.css'));
                unExp.push(createElementComp('part', rng));
                unExp.push(createGlobalComp(rng));
                asserter.suggested(exp);
                asserter.notSuggested(unExp);
            });
        });
    });

    describe('Imported states', () => {
        const str1 = ':state';
        const str2 = ':otherState';
        const str3 = ':anotherState';
        const str4 = ':oneMoreState';

        const createCompletion = (str: string, rng: ProviderRange, path: string) =>
            asserters.stateSelectorCompletion(str.slice(1), rng, path);

        [str1, str2].forEach((str, j, a) => {
            str.split('').forEach((_c, i) => {
                const prefix = str.slice(0, i);

                it(
                    'should complete state ' +
                        str +
                        ' value for default import used as tag, with prefix ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(6, 4, 6, 4 + i);
                        const asserter = asserters.getCompletions(
                            'pseudo-elements/default-import-as-tag.st.css',
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
                    }
                );

                it(
                    'should complete state ' +
                        str +
                        ' value for local class extending default import, with prefix ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(9, 5, 9, 5 + i);
                        const asserter = asserters.getCompletions(
                            'pseudo-elements/default-import-extended.st.css',
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
                    }
                );
            });
        });

        [str3, str4].forEach((str, j, a) => {
            str.split('').forEach((_c, i) => {
                const prefix = str.slice(0, i);

                it(
                    'should complete state ' +
                        str +
                        ' value for local class extending named import, with prefix ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(9, 5, 9, 5 + i);
                        const asserter = asserters.getCompletions(
                            'pseudo-elements/named-import-extended-named.st.css',
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
                        notExp.push(createCompletion(str1, rng, './import.st.css'));
                        notExp.push(createCompletion(str2, rng, './import.st.css'));
                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    }
                );
            });
        });

        [str1, str2].forEach((str, j, a) => {
            str.split('').forEach((_c, i) => {
                const prefix = str.slice(0, i);
                it(
                    'should complete state ' +
                        str +
                        ' after pseudo-element, with prefix ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(10, 11, 10, 11 + i);
                        const asserter = asserters.getCompletions(
                            'pseudo-elements/recursive-import-3.st.css',
                            prefix
                        );
                        const exp: Array<Partial<Completion>> = [];
                        const notExp: Array<Partial<Completion>> = [];
                        exp.push(createCompletion(a[j], rng, './recursive-import-1.st.css'));
                        if (prefix.length <= 1) {
                            exp.push(
                                createCompletion(a[1 - j], rng, './recursive-import-1.st.css')
                            );
                        } else {
                            notExp.push(
                                createCompletion(a[1 - j], rng, './recursive-import-1.st.css')
                            );
                        }
                        notExp.push(createCompletion(str3, rng, './recursive-import-1.st.css'));
                        notExp.push(createCompletion(str4, rng, './recursive-import-1.st.css'));
                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    }
                );

                it(
                    'should complete state ' +
                        str +
                        ' after pseudo-element when line has leading spaces, with prefix ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(10, 12, 10, 12 + i);
                        const asserter = asserters.getCompletions(
                            'pseudo-elements/recursive-import-3-leading-space.st.css',
                            prefix
                        );
                        const exp: Array<Partial<Completion>> = [];
                        const notExp: Array<Partial<Completion>> = [];
                        exp.push(createCompletion(a[j], rng, './recursive-import-1.st.css'));
                        if (prefix.length <= 1) {
                            exp.push(
                                createCompletion(a[1 - j], rng, './recursive-import-1.st.css')
                            );
                        } else {
                            notExp.push(
                                createCompletion(a[1 - j], rng, './recursive-import-1.st.css')
                            );
                        }
                        notExp.push(createCompletion(str3, rng, './recursive-import-1.st.css'));
                        notExp.push(createCompletion(str4, rng, './recursive-import-1.st.css'));
                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    }
                );
            });
        });

        [str3, str4].forEach((str) => {
            str.split('').forEach((_c, i) => {
                const prefix = str.slice(0, i);
                it(
                    'should complete only unused pseudo-element states when pseudo-element state exists, with prefix ' +
                        prefix +
                        ' ',
                    () => {
                        const rng = createRange(9, 25, 9, 25 + i);
                        const asserter = asserters.getCompletions(
                            'pseudo-elements/multiple-states.st.css',
                            prefix
                        );
                        const exp: Array<Partial<Completion>> = [];
                        const notExp: Array<Partial<Completion>> = [];
                        if (prefix.length <= 1 || str === str4) {
                            exp.push(createCompletion(str4, rng, './import.st.css'));
                        }
                        notExp.push(createCompletion(str1, rng, './import.st.css'));
                        notExp.push(createCompletion(str2, rng, './import.st.css'));
                        notExp.push(createCompletion(str3, rng, './import.st.css'));
                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    }
                );
            });
        });
    });

    describe('Deep recursive imports', () => {
        const str = ':loompa';
        const createCompletion = (str: string, rng: ProviderRange, path: string) =>
            asserters.stateSelectorCompletion(str.slice(1), rng, path);

        str.split('').forEach((_c, i) => {
            const prefix = str.slice(0, i);
            const rng = createRange(10, 52, 10, 52 + i);
            it(
                'should complete state ' +
                    str +
                    ' in deep chain ending with state, with prefix ' +
                    prefix +
                    ' ',
                () => {
                    const asserter = asserters.getCompletions(
                        'pseudo-elements/recursive-import-3-deep-state.st.css',
                        prefix
                    );
                    const exp: Array<Partial<Completion>> = [];
                    const notExp: Array<Partial<Completion>> = [];
                    exp.push(createCompletion(str, rng, './recursive-import-0.st.css'));
                    asserter.suggested(exp);
                    asserter.notSuggested(notExp);
                }
            );
        });
    });
});
