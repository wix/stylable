import {
    createRange,
    ProviderRange,
} from '@stylable/language-service/dist/lib/completion-providers';
import type { Completion } from '@stylable/language-service/dist/lib/completion-types';
import * as asserters from '../../test-kit/completions-asserters';

describe('States', () => {
    describe('State with param', () => {
        describe('Definition', () => {
            it('should complete available states param types', () => {
                const rng = createRange(1, 22, 1, 22);
                const createCompletion = (str: string, rng: ProviderRange, path?: string) =>
                    asserters.stateTypeDefinitionCompletion(str, rng, path);

                const asserter = asserters.getCompletions(
                    'states/with-param/state-def-with-param-start.st.css',
                );
                const exp: Array<Partial<Completion>> = [];
                exp.push(createCompletion('string', rng));
                exp.push(createCompletion('number', rng));
                exp.push(createCompletion('enum', rng));
                asserter.suggested(exp);
            });

            describe('String', () => {
                it('should complete available state with the start of a "string" pre-written', () => {
                    const rng = createRange(1, 22, 1, 23);
                    const createCompletion = (str: string, rng: ProviderRange, path?: string) =>
                        asserters.stateTypeDefinitionCompletion(str, rng, path);

                    const asserter = asserters.getCompletions(
                        'states/with-param/string/state-def-with-param-string-start.st.css',
                    );
                    const exp: Array<Partial<Completion>> = [];
                    const unExp: Array<Partial<Completion>> = [];
                    exp.push(createCompletion('string', rng));
                    unExp.push(createCompletion('number', rng));
                    unExp.push(createCompletion('enum', rng));
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
                            path?: string,
                        ) =>
                            asserters.stateValidatorDefinitionCompletion(
                                validator,
                                rng,
                                type,
                                path,
                            );

                        const asserter = asserters.getCompletions(
                            'states/with-param/string/local-state-string-validators.st.css',
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
                            path?: string,
                        ) =>
                            asserters.stateValidatorDefinitionCompletion(
                                validator,
                                rng,
                                type,
                                path,
                            );

                        const asserter = asserters.getCompletions(
                            'states/with-param/string/state-def-with-param-string-regex-start.st.css',
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
                            path?: string,
                        ) =>
                            asserters.stateValidatorDefinitionCompletion(
                                validator,
                                rng,
                                type,
                                path,
                            );

                        const asserter = asserters.getCompletions(
                            'states/with-param/string/state-def-with-param-string-contains-start.st.css',
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
                            path?: string,
                        ) =>
                            asserters.stateValidatorDefinitionCompletion(
                                validator,
                                rng,
                                type,
                                path,
                            );

                        const asserter = asserters.getCompletions(
                            'states/with-param/string/state-def-with-param-string-m-start.st.css',
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
                        'states/with-param/number/state-def-with-param-number-start.st.css',
                    );
                    const exp: Array<Partial<Completion>> = [];
                    const unExp: Array<Partial<Completion>> = [];
                    exp.push(createCompletion('number', rng));
                    unExp.push(createCompletion('string', rng));
                    unExp.push(createCompletion('enum', rng));
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
                            path?: string,
                        ) =>
                            asserters.stateValidatorDefinitionCompletion(
                                validator,
                                rng,
                                type,
                                path,
                            );

                        const asserter = asserters.getCompletions(
                            'states/with-param/number/local-state-number-validators.st.css',
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
                            path?: string,
                        ) =>
                            asserters.stateValidatorDefinitionCompletion(
                                validator,
                                rng,
                                type,
                                path,
                            );

                        const asserter = asserters.getCompletions(
                            'states/with-param/number/state-def-with-param-number-min-start.st.css',
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
                            path?: string,
                        ) =>
                            asserters.stateValidatorDefinitionCompletion(
                                validator,
                                rng,
                                type,
                                path,
                            );

                        const asserter = asserters.getCompletions(
                            'states/with-param/number/state-def-with-param-number-max-start.st.css',
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
                            path?: string,
                        ) =>
                            asserters.stateValidatorDefinitionCompletion(
                                validator,
                                rng,
                                type,
                                path,
                            );

                        const asserter = asserters.getCompletions(
                            'states/with-param/number/state-def-with-param-number-multiple-start.st.css',
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
                        'states/with-param/enum/state-def-with-param-enum-start.st.css',
                    );
                    const exp: Array<Partial<Completion>> = [];
                    const unExp: Array<Partial<Completion>> = [];
                    exp.push(createCompletion('enum', rng));
                    unExp.push(createCompletion('number', rng));
                    unExp.push(createCompletion('string', rng));
                    asserter.suggested(exp);
                    asserter.notSuggested(unExp);
                });
            });
        });
    });
});
