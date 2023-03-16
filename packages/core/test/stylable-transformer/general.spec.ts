import { expect } from 'chai';
import type * as postcss from 'postcss';
import { generateStylableRoot, testStylableCore } from '@stylable/core-test-kit';

describe('Stylable postcss transform (General)', () => {
    it('should output empty on empty input', () => {
        const result = generateStylableRoot({
            entry: `/style.st.css`,
            files: {
                '/style.st.css': {
                    content: '',
                },
            },
        });

        expect(result.toString()).to.equal('');
    });

    it('should support multiple selectors/properties with same name', () => {
        const result = generateStylableRoot({
            entry: `/a/b/style.st.css`,
            files: {
                '/a/b/style.st.css': {
                    content: `
                        .root {
                            color: red;
                            color: blue;
                        }
                        .root {
                            color: red;
                            color: blue;
                        }
                    `,
                },
            },
        });

        const rule = result.nodes[0] as postcss.Rule;
        expect(rule.nodes[0].toString(), 'color1').to.equal('color: red');
        expect(rule.nodes[1].toString(), 'color1').to.equal('color: blue');

        const rule2 = result.nodes[1] as postcss.Rule;
        expect(rule2.nodes[0].toString(), 'color1').to.equal('color: red');
        expect(rule2.nodes[1].toString(), 'color1').to.equal('color: blue');
    });
    it('should continue inferred selector after combinator', () => {
        // ToDo: remove once experimentalSelectorInference is the default
        testStylableCore({
            'comp.st.css': `.part {} `,
            'entry.st.css': `
                @st-import Comp from './comp.st.css';
                .class { -st-states: state; }

                /* @rule(state) .entry__class .entry--state */
                .class :state {}
                
                /* @rule(pseudo-element) .comp__root  .comp__part */
                Comp ::part {}
        
                /* @rule(unknown pseudo-element) .comp__root ::class */
                Comp ::class {}
            `,
        });
    });
    it('should continue inferred selector after universal', () => {
        // ToDo: remove once experimentalSelectorInference is the default
        testStylableCore(`
            .root { -st-states: state; }
            .part {}

            /* @rule(state) *.entry--state */
            *:state {}
            
            /* @rule(element) * .entry__part */
            *::part {}
        `);
    });

    describe('experimentalSelectorInference', () => {
        it('should reset inferred selector after combinator', () => {
            // ToDo: fix extra space before ".entry__class"
            testStylableCore(
                {
                    'comp.st.css': ` .part {} `,
                    'entry.st.css': `
                        @st-import Comp from './comp.st.css';
                        .class { -st-states: state; }
                    
                        /* @rule(unknown state) .entry__class :state */
                        .class :state {}
            
                        /* @rule(unknown pseudo-element) .comp__root ::part */
                        Comp ::part {}
            
                        /* @rule(standalone pseudo-element) .comp__root  .entry__class */
                        Comp ::class {}
                    `,
                },
                { stylableConfig: { experimentalSelectorInference: true } }
            );
        });
        it('should set inferred selector after universal (to universal)', () => {
            testStylableCore(
                `
                    .root { -st-states: state; }
                    .part {}
        
                    /* @rule(state) *:state */
                    *:state {}
                    
                    /* @rule(element) *::part */
                    *::part {}
                `,
                { stylableConfig: { experimentalSelectorInference: true } }
            );
        });
    });
});
