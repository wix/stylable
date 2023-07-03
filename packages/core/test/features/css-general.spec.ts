import { shouldReportNoDiagnostics, testStylableCore } from '@stylable/core-test-kit';

describe('features/css-general', () => {
    describe('svg', () => {
        it('should preserve path value function quotes', () => {
            // ToDo: remove once experimentalSelectorInference is the default
            const { sheets } = testStylableCore(`
                
                .path { 
                    /* @decl d: path("M0 0 L10 0 L10 10Z") */
                    d: path("M0 0 L10 0 L10 10Z");
                }
            `);

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
    });
});
