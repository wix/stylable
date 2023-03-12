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
            const { service, carets, assertCompletions } = testLangService(`
                .x {
                    -st-states: aaa,bbb;
                }


                @st-scope .x {
                    &^afterColon^
                }

                @st-scope .x {
                    @media (max-width<500) {
                        &^afterColonInMedia^
                    }
                }
            `);
            const entryCarets = carets['/entry.st.css'];

            assertCompletions({
                message: 'after colon',
                actualList: service.onCompletion('/entry.st.css', entryCarets.afterColon),
                expectedList: [{ label: ':aaa' }, { label: ':bbb' }],
            });

            assertCompletions({
                message: 'after colon in media',
                actualList: service.onCompletion('/entry.st.css', entryCarets.afterColonInMedia),
                expectedList: [{ label: ':aaa' }, { label: ':bbb' }],
            });
        });
        it('should suggest class custom states with nesting selector (empty)', () => {
            const { service, carets, assertCompletions } = testLangService(`
                .x {
                    -st-states: aaa,bbb;
                }


                @st-scope .x {
                    ^afterColon^
                }

                @st-scope .x {
                    @media (max-width<500) {
                        ^afterColonInMedia^
                    }
                }
            `);
            const entryCarets = carets['/entry.st.css'];

            assertCompletions({
                message: 'after colon',
                actualList: service.onCompletion('/entry.st.css', entryCarets.afterColon),
                expectedList: [{ label: ':aaa' }, { label: ':bbb' }],
            });

            assertCompletions({
                message: 'after colon in media',
                actualList: service.onCompletion('/entry.st.css', entryCarets.afterColonInMedia),
                expectedList: [{ label: ':aaa' }, { label: ':bbb' }],
            });
        });
        it('should suggest class custom states after colon (no nesting selector)', () => {
            // Notice: this is a (design?) quirk in the transformer atm. The final state selector is not
            // in the same compound selector as the nesting selector and it's a bit weird to
            // keep the context after the nesting descendant combinator, but that's the way the transformer
            // work currently - ToDo: think about changing this behavior.
            const { service, carets, assertCompletions, textEditContext } = testLangService(`
                .x {
                    -st-states: aaa,bbb;
                }


                @st-scope .x {
                    :^afterColon^
                }

                @st-scope .x {
                    @media (max-width<500) {
                        :^afterColonInMedia^
                    }
                }
            `);
            const entryCarets = carets['/entry.st.css'];
            const { replaceText } = textEditContext('/entry.st.css');

            assertCompletions({
                message: 'after colon',
                actualList: service.onCompletion('/entry.st.css', entryCarets.afterColon),
                expectedList: [
                    {
                        label: ':aaa',
                        textEdit: replaceText(entryCarets.afterColon, ':aaa', { deltaStart: -1 }),
                    },
                    {
                        label: ':bbb',
                        textEdit: replaceText(entryCarets.afterColon, ':bbb', { deltaStart: -1 }),
                    },
                ],
            });

            assertCompletions({
                message: 'after colon in media',
                actualList: service.onCompletion('/entry.st.css', entryCarets.afterColonInMedia),
                expectedList: [
                    {
                        label: ':aaa',
                        textEdit: replaceText(entryCarets.afterColonInMedia, ':aaa', {
                            deltaStart: -1,
                        }),
                    },
                    {
                        label: ':bbb',
                        textEdit: replaceText(entryCarets.afterColonInMedia, ':bbb', {
                            deltaStart: -1,
                        }),
                    },
                ],
            });
        });
        describe('experimentalSelectorResolve', () => {
            it('should suggest matching intersection states', () => {
                const { service, carets, assertCompletions } = testLangService(`
                    .a {
                        -st-states: shared, onlyA;
                    }
                    .b {
                        -st-states: shared, onlyB;
                    }


                    @st-scope .a, .b {
                        :^^
                    }

                `);
                const entryCarets = carets['/entry.st.css'];

                assertCompletions({
                    actualList: service.onCompletion('/entry.st.css', entryCarets[0]),
                    expectedList: [{ label: ':shared' }],
                    unexpectedList: [{ label: ':onlyA' }, { label: ':onlyB' }],
                });
            });
        });
    });
});
