import {
    generateStylableResult,
    generateStylableRoot,
    matchRuleAndDeclaration,
} from '@stylable/core-test-kit';
import { processorWarnings } from '@stylable/core';
import { expect } from 'chai';

describe('Partial CSS Mixins', () => {
    it('should warn on partial mixins with no override arguments', () => {
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
            processorWarnings.PARTIAL_MIXIN_MISSING_ARGUMENTS('my-mixin')
        );
        matchRuleAndDeclaration(
            result.meta.outputAst!,
            1,
            '.entry__container',
            '',
            'mixin does not apply'
        );
    });

    it('should include any declaration that contains overridden variables', () => {
        const result = generateStylableResult({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                
                :vars {
                    c1: red;
                    c2: blue;
                    c3: green;
                }

                .my-mixin {
                    color: value(c1);
                    background: value(c1), value(c2);
                    background: value(c1), value(c3);
                }
                .container {
                    -st-partial-mixin: my-mixin(c1 black, c2 white);
                }
            `,
                },
            },
        });

        expect(result.meta.diagnostics.reports).to.have.lengthOf(0);
        matchRuleAndDeclaration(
            result.meta.outputAst!,
            1,
            '.entry__container',
            'color: black;background: black, white;background: black, green'
        );
    });

    it('should work with -st-mixin', () => {
        const result = generateStylableResult({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                
                :vars {
                    c1: red;
                    c2: blue;
                    c3: green;
                }

                .my-mixin1 {
                    z-index: 0;
                    color: value(c1);
                }

                .my-mixin2 {
                    z-index: 1;
                    border: 1px solid value(c1);
                }

                .container {
                    -st-mixin: my-mixin1;
                    -st-partial-mixin: my-mixin2(c1 black);
                }
            `,
                },
            },
        });

        expect(result.meta.diagnostics.reports).to.have.lengthOf(0);
        matchRuleAndDeclaration(
            result.meta.outputAst!,
            2,
            '.entry__container',
            'z-index: 0;color: red;border: 1px solid black'
        );
    });

    it('should include any rules and declaration that contains overridden variables (local partial mixin)', () => {
        const result = generateStylableRoot({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                :vars {
                    myColor: red;
                    size: 1px;
                }  
                
                .container {
                    -st-partial-mixin: my-mixin(myColor yellow);
                }

                .my-mixin {
                    color: value(myColor);
                    background: green;
                }
                .my-mixin .x {
                    border: value(size) solid value(myColor);
                    z-index: 0;
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
            '.entry__container .entry__x',
            'border: 1px solid yellow'
        );
        matchRuleAndDeclaration(
            result,
            2,
            '.entry__container .entry__y',
            'border: 1px solid yellow'
        );
        // mixin does not change
        matchRuleAndDeclaration(result, 3, '.entry__my-mixin', 'color: red;background: green');
    });

    it('should include any rules and declaration that contains overridden variables (imported partial mixin)', () => {
        const result = generateStylableRoot({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-from: "./mixin.st.css";
                            -st-named: my-mixin;
                        }    
                        .container {
                            -st-partial-mixin: my-mixin(myColor yellow);
                        }
                    
                    `,
                },
                '/mixin.st.css': {
                    namespace: 'imported',
                    content: `
                :vars {
                    myColor: red;
                    size: 1px;
                }  
                
                .my-mixin {
                    color: value(myColor);
                    background: green;
                }
                .my-mixin .x {
                    border: value(size) solid value(myColor);
                    z-index: 0;
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
            '.entry__container .imported__x',
            'border: 1px solid yellow'
        );
        matchRuleAndDeclaration(
            result,
            2,
            '.entry__container .imported__y',
            'border: 1px solid yellow'
        );
    });
});
