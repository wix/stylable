import { expect } from 'chai';
import type * as postcss from 'postcss';
import { generateStylableRoot } from '@stylable/core-test-kit';

describe('@property support', () => {
    it('should transform @property var definition', () => {
        const result = generateStylableRoot({
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

        const prop1 = result.nodes[0] as postcss.AtRule;
        const prop2 = result.nodes[1] as postcss.AtRule;

        expect(prop1.params).to.equal('--global');
        expect(prop2.params).to.equal('--entry-radius');
    });
});
