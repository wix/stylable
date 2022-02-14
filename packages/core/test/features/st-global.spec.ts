import { STGlobal } from '@stylable/core/dist/features';
import { testStylableCore, shouldReportNoDiagnostics } from '@stylable/core-test-kit';
import { expect } from 'chai';

describe(`features/st-global`, () => {
    it(`should remove :global() and keep inner selector untransformed`, () => {
        const { sheets } = testStylableCore(`
            /* @rule(simple selector) .a */
            :global(.a) {}

            /* @rule(complex selector) .entry__root .b .entry__part */
            .root :global(.b) .part {}

            /* @rule(complex global) div.c .d */
            :global(div.c .d) {}
        `);

        const { meta } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        // meta.globals
        expect(meta.globals, `collect class ids`).to.eql({
            a: true,
            b: true,
            c: true,
            d: true,
        });
    });
    it(`should handle only a single selector in :global()`, () => {
        // ToDo: deprecate multi selector transformation in next major and change to error
        testStylableCore(`
            /* 
                @rule(multi) .a .b
                @analyze-info(multi) word(.a, .b) ${STGlobal.diagnostics.UNSUPPORTED_MULTI_SELECTOR_IN_GLOBAL()}
            */
            :global(.a, .b) {}
        `);
    });
});
