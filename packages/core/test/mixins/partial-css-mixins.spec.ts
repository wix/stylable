import {
    generateStylableResult,
    generateStylableRoot,
    // matchAllRulesAndDeclarations,
    matchRuleAndDeclaration,
} from '@stylable/core-test-kit';
import { expect } from 'chai';
import postcss from 'postcss';

describe('Partial CSS Mixins', () => {
    it('only use partial mixins with override arguments', () => {
        const result = generateStylableResult({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                .my-mixin {
                    color: red;
                }
                .container {
                    -st-partial-mixin: my-mixin;
                }
            `,
                },
            },
        });

        const report = result.meta.diagnostics.reports[0];
        expect(report.message).to.equal(
            `"-st-partial-mixin" can only be used when override arguments are provided, missing overrides on "my-mixin"`
        );
        matchRuleAndDeclaration(
            result.meta.outputAst!,
            1,
            '.entry__container',
            '',
            'mixin dose not apply'
        );
    });
    it('only copy used deceleration that the override arguments target (root mixin selector)', () => {
        const result = generateStylableRoot({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                :vars {
                    myColor: red;
                }  
                
                .container {
                    -st-partial-mixin: my-mixin(myColor yellow);
                }

                .my-mixin {
                    color: value(myColor);
                    background: green;
                }
                .my-mixin .y {
                    border: 1px solid value(myColor);
                    z-index: 1;
                }
                .my-mixin .z {
                    z-index: 2;
                }
                
            `,
                },
            },
        });

        matchRuleAndDeclaration(result, 0, '.entry__container', 'color: yellow');
        matchRuleAndDeclaration(
            result,
            1,
            '.entry__container .entry__y',
            'border: 1px solid yellow'
        );
        matchRuleAndDeclaration(result, 2, '.entry__my-mixin', 'color: red;background: green');
    });
});
