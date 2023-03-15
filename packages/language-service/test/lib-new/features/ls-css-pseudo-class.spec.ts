import { testLangService } from '../../test-kit/test-lang-service';

describe('LS: css-pseudo-class', () => {
    it('should suggest root custom states', () => {
        const { service, carets, assertCompletions } = testLangService(`
            .root {
                -st-states: aaa,bbb;
            }

            .root^afterRoot^ {}

            ^empty^ {}

        `);
        const entryCarets = carets['/entry.st.css'];

        assertCompletions({
            actualList: service.onCompletion('/entry.st.css', entryCarets.afterRoot),
            expectedList: [{ label: ':aaa' }, { label: ':bbb' }],
        });

        assertCompletions({
            actualList: service.onCompletion('/entry.st.css', entryCarets.empty),
            expectedList: [{ label: ':aaa' }, { label: ':bbb' }],
        });
    });
    describe('st-scope', () => {
        it('should suggest class custom states (in st-scope params)', () => {
            const { service, carets, assertCompletions } = testLangService(`
                .root {
                    -st-states: aaa,bbb;
                }


                @st-scope .root^afterRoot^ {}
                @st-scope ^empty^ {}

            `);
            const entryCarets = carets['/entry.st.css'];

            assertCompletions({
                actualList: service.onCompletion('/entry.st.css', entryCarets.afterRoot),
                expectedList: [{ label: ':aaa' }, { label: ':bbb' }],
            });

            assertCompletions({
                actualList: service.onCompletion('/entry.st.css', entryCarets.empty),
                expectedList: [{ label: ':aaa' }, { label: ':bbb' }],
            });
        });
        it('should suggest class custom states with nesting selector', () => {
            const { service, carets, assertCompletions, textEditContext } = testLangService(`
                .x {
                    -st-states: aaa,bbb;
                }


                @st-scope .x {
                    &^nest^
                    &:^nestColon^
                }

                @st-scope .x {
                    @media (max-width<500) {
                        &^nestInMedia^
                        &:^nestColonInMedia^
                    }
                }
            `);
            const entryCarets = carets['/entry.st.css'];
            const { replaceText } = textEditContext('/entry.st.css');

            assertCompletions({
                message: 'after &',
                actualList: service.onCompletion('/entry.st.css', entryCarets.nest),
                expectedList: [{ label: ':aaa' }, { label: ':bbb' }],
            });

            assertCompletions({
                message: 'after & in media',
                actualList: service.onCompletion('/entry.st.css', entryCarets.nestInMedia),
                expectedList: [{ label: ':aaa' }, { label: ':bbb' }],
            });

            assertCompletions({
                message: 'after &:',
                actualList: service.onCompletion('/entry.st.css', entryCarets.nestColon),
                expectedList: [
                    {
                        label: ':aaa',
                        textEdit: replaceText(entryCarets.nestColon, ':aaa', { deltaStart: -1 }),
                    },
                    {
                        label: ':bbb',
                        textEdit: replaceText(entryCarets.nestColon, ':bbb', { deltaStart: -1 }),
                    },
                ],
            });

            assertCompletions({
                message: 'after &: in media',
                actualList: service.onCompletion('/entry.st.css', entryCarets.nestColonInMedia),
                expectedList: [
                    {
                        label: ':aaa',
                        textEdit: replaceText(entryCarets.nestColonInMedia, ':aaa', {
                            deltaStart: -1,
                        }),
                    },
                    {
                        label: ':bbb',
                        textEdit: replaceText(entryCarets.nestColonInMedia, ':bbb', {
                            deltaStart: -1,
                        }),
                    },
                ],
            });
        });
        it('should suggest root custom states an empty nested selector', () => {
            const { service, carets, assertCompletions, textEditContext } = testLangService(`
                .root {
                    -st-states: root-state;
                }
                .x {
                    -st-states: aaa,bbb;
                }


                @st-scope .x {
                    ^empty^
                    :^colon^
                }

                @st-scope .x {
                    @media (max-width<500) {
                        ^emptyInMedia^
                        :^colonInMedia^
                    }
                }
            `);
            const entryCarets = carets['/entry.st.css'];
            const { replaceText } = textEditContext('/entry.st.css');

            assertCompletions({
                message: 'empty',
                actualList: service.onCompletion('/entry.st.css', entryCarets.empty),
                expectedList: [{ label: ':root-state' }],
                unexpectedList: [{ label: ':aaa' }, { label: ':bbb' }],
            });

            assertCompletions({
                message: 'empty in media',
                actualList: service.onCompletion('/entry.st.css', entryCarets.emptyInMedia),
                expectedList: [{ label: ':root-state' }],
                unexpectedList: [{ label: ':aaa' }, { label: ':bbb' }],
            });

            assertCompletions({
                message: 'colon',
                actualList: service.onCompletion('/entry.st.css', entryCarets.colon),
                expectedList: [
                    {
                        label: ':root-state',
                        textEdit: replaceText(entryCarets.colon, ':root-state', {
                            deltaStart: -1,
                        }),
                    },
                ],
                unexpectedList: [{ label: ':aaa' }, { label: ':bbb' }],
            });

            assertCompletions({
                message: 'colonInMedia',
                actualList: service.onCompletion('/entry.st.css', entryCarets.colonInMedia),
                expectedList: [
                    {
                        label: ':root-state',
                        textEdit: replaceText(entryCarets.colonInMedia, ':root-state', {
                            deltaStart: -1,
                        }),
                    },
                ],
                unexpectedList: [{ label: ':aaa' }, { label: ':bbb' }],
            });
        });
        it('should suggest matching intersection states', () => {
            const { service, carets, assertCompletions, textEditContext } = testLangService({
                'comp.st.css': `
                    .root {
                        -st-states: comp-state;
                    }
                `,
                'entry.st.css': `
                    @st-import Comp from './comp.st.css';
                    .root {
                        -st-extends: Comp;
                        -st-states: root-state;
                    }
                    .a {
                        -st-states: shared, onlyA;
                    }
                    .b {
                        -st-states: shared, onlyB;
                    }


                    @st-scope .a, .b {
                        ^inScope^
                        &^nest^
                        &:^nestColon^
                    }

                `,
            });
            const entryCarets = carets['/entry.st.css'];
            const { replaceText } = textEditContext('/entry.st.css');

            assertCompletions({
                actualList: service.onCompletion('/entry.st.css', entryCarets.inScope),
                expectedList: [{ label: ':root-state' }, { label: ':comp-state' }],
                unexpectedList: [{ label: ':shared' }, { label: ':onlyA' }, { label: ':onlyB' }],
            });

            assertCompletions({
                actualList: service.onCompletion('/entry.st.css', entryCarets.nest),
                expectedList: [{ label: ':shared' }],
                unexpectedList: [
                    { label: ':onlyA' },
                    { label: ':onlyB' },
                    { label: ':root-state' },
                ],
            });

            assertCompletions({
                actualList: service.onCompletion('/entry.st.css', entryCarets.nestColon),
                expectedList: [
                    {
                        label: ':shared',
                        textEdit: replaceText(entryCarets.nestColon, ':shared', {
                            deltaStart: -1,
                        }),
                    },
                ],
                unexpectedList: [
                    { label: ':onlyA' },
                    { label: ':onlyB' },
                    { label: ':root-state' },
                ],
            });
        });
    });
});
