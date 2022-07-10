import { STGlobal } from '@stylable/core/dist/features';
import {
    testStylableCore,
    shouldReportNoDiagnostics,
    diagnosticBankReportToStrings,
} from '@stylable/core-test-kit';
import { expect } from 'chai';

const stGlobalDiagnostics = diagnosticBankReportToStrings(STGlobal.diagnostics);

describe(`features/st-global`, () => {
    it(`should remove :global() and keep inner selector untransformed`, () => {
        const { sheets } = testStylableCore(`
            /* @rule(simple selector) .a */
            :global(.a) {}

            /* @rule(complex selector) .entry__root .b .entry__part */
            .root :global(.b) .part {}

            /* @rule(complex global) div.c .d */
            :global(div.c .d) {}

            .root {
                -st-states: isOn;
            }
            .part {}
            
            /* @rule(custom pseudo) .entry__root.entry--isOn .entry__part.root:isOn::part */
            .root:isOn::part:global(.root:isOn::part) {}
        `);

        const { meta } = sheets['/entry.st.css'];

        shouldReportNoDiagnostics(meta);

        // meta.globals
        expect(meta.globals, `collect global class ids`).to.eql({
            a: true,
            b: true,
            c: true,
            d: true,
            root: true,
        });
    });
    it(`should handle only a single selector in :global()`, () => {
        testStylableCore(`
            /* 
                @rule(multi) :global(.a, .b)
                @analyze-error(multi) word(.a, .b) ${stGlobalDiagnostics.UNSUPPORTED_MULTI_SELECTOR_IN_GLOBAL()}
            */
            :global(.a, .b) {}
        `);
    });
});
