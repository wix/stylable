import { expect } from 'chai';
import type * as postcss from 'postcss';
import { generateStylableResult } from '@stylable/core-test-kit';

describe('@property support', () => {
    it('should transform @property definition', () => {
        const { meta } = generateStylableResult({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        @st-global-custom-property --global;
               
                        @property --global {
                            syntax: "<length>";
                            inherits: false;
                            initial-value: 0px;
                        }

                        @property --radius {
                            syntax: "<length>";
                            inherits: false;
                            initial-value: 0px;
                        }

                        .root {
                            --radius: 10px;
                            --global: 20px;
                        }
                        
                        `,
                },
            },
        });

        const prop1 = meta.outputAst!.nodes[0] as postcss.AtRule;
        const prop2 = meta.outputAst!.nodes[1] as postcss.AtRule;

        expect(prop1.params).to.equal('--global');
        expect(prop2.params).to.equal('--entry-radius');
    });
    it('should detect and export @property definition', () => {
        const { exports, meta } = generateStylableResult({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
               
                        @property --my-var {
                            syntax: "<length>";
                            inherits: false;
                            initial-value: 0px;
                        }
                        
                        `,
                },
            },
        });

        const prop1 = meta.outputAst!.nodes[0] as postcss.AtRule;

        expect(prop1.params).to.equal('--entry-my-var');

        expect(exports.vars).to.eql({
            'my-var': '--entry-my-var',
        });
    });
});
