import { processorWarnings } from '@stylable/core';
import {
    expectWarningsFromTransform,
    generateStylableResult,
    styleRules,
} from '@stylable/core-test-kit';
import chai, { expect } from 'chai';
import type * as postcss from 'postcss';

chai.use(styleRules);

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
    it('should detect existing css variable and show warning', () => {
        const config = {
            entry: `/entry.st.css`,
            files: {
                '/a.st.css': {
                    namespace: 'a',
                    content: `
                        .root {
                            --my-var: red;
                        }
                    `,
                },
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        @st-import [--my-var] from "./a.st.css";

                        |@property $--my-var$|;
                        `,
                },
            },
        };

        const res = expectWarningsFromTransform(config, [
            {
                file: '/entry.st.css',
                message: processorWarnings.REDECLARE_SYMBOL('--my-var'),
            },
        ]);

        expect(res).to.have.styleRules(['-a--my-var']);
    });
});
