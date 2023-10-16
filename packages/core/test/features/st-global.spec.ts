import { STGlobal } from '@stylable/core/dist/features';
import {
    testStylableCore,
    shouldReportNoDiagnostics,
    diagnosticBankReportToStrings,
    collectAst,
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
    it('should collect global rules', () => {
        const { sheets } = testStylableCore(`
            /* global: single */
            :global(*) {}

            /* global: multiple globals */
            :global(*):global(.x) /*comment*/ :global(.y) {}

            /* local: simple */
            .x {}

            /* global: mixed multi selectors */
            .x, :global(*) {}

            /* global: universal without :global */
            * {}

            /* global: type without :global */
            div {}

            /* local: mix start with global */
            :global(.x) .local {}

            /* local: mix ends with global */
            .local :global(.x) {}

            /* local: mix ends with global in pseudo-class */
            :is(:global(.x), .local)  {} 
        `);

        const { meta } = sheets['/entry.st.css'];

        const actualGlobalRules = STGlobal.getGlobalRules(meta);

        const expectedGlobalRules = collectAst(meta.sourceAst, ['global']);
        expect(actualGlobalRules).to.eql(expectedGlobalRules['global']);
    });
    it('should set wildcard inferred selector to context after :global()', () => {
        testStylableCore({
            'comp.st.css': ` .part {} `,
            'entry.st.css': `
                    @st-import Comp from './comp.st.css';
                    .class { -st-states: state('.class-state'); }
                
                    /* @rule(root state) .entry__class.g:state */
                    .class:global(.g):state {}
        
                    /* @rule(unknown comp pseudo-element) .comp__root.g::part */
                    Comp:global(.g)::part {}
        
                    /* @rule(unknown pseudo-element) .comp__root.g::class */
                    Comp:global(.g)::class {}

                    /* @rule(universal pseudo-element) .comp__root.g ::class */
                    Comp:global(.g) ::class {}
                `,
        });
    });
    describe('experimentalSelectorInference=false', () => {
        it('should continue inferred selector after :global()', () => {
            testStylableCore(
                {
                    'comp.st.css': `.part {} `,
                    'entry.st.css': `
                    @st-import Comp from './comp.st.css';
                    .class { -st-states: state; }
                    /* @rule(state) .entry__class.g.entry--state */
                    .class:global(.g):state {}
                    
                    /* @rule(pseudo-element) .comp__root.g .comp__part */
                    Comp:global(.g)::part {}
            
                    /* @rule(unknown pseudo-element) .comp__root.g::class */
                    Comp:global(.g)::class {}
                `,
                },
                {
                    stylableConfig: { experimentalSelectorInference: false },
                }
            );
        });
    });
});
