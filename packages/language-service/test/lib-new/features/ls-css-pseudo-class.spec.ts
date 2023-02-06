import { testLangService } from '../../test-kit/test-lang-service';

describe('LS: css-pseudo-class', () => {
    it('should suggest root custom states', () => {
        const { service, carets, assertCompletions } = testLangService(`
            .root {
                -st-states: aaa,bbb;
            }

            .root/*^afterRoot*/ {}

            /*^empty*/ {}

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


                @st-scope .root/*^afterRoot*/ {}
                @st-scope /*^empty*/ {}

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
        it.skip('should suggest class custom states (nested)', () => {
            const { service, carets, assertCompletions } = testLangService(`
                .x {
                    -st-states: aaa,bbb;
                }


                @st-scope .x {
                    /*^nested*/
                }
            `);
            const entryCarets = carets['/entry.st.css'];

            assertCompletions({
                actualList: service.onCompletion('/entry.st.css', entryCarets.nested),
                expectedList: [{ label: ':aaa' }, { label: ':bbb' }],
            });
        });
    });
});
