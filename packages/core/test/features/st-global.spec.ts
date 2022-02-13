import { STGlobal } from '@stylable/core/dist/features';
import { testStylableCore } from '@stylable/core-test-kit';

describe(`features/st-global`, () => {
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
