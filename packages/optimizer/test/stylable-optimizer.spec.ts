import { expect } from 'chai';
import * as postcss from 'postcss';
import { generateStylableResult } from '@stylable/core-test-kit';
import { removeCommentNodes, StylableOptimizer } from '@stylable/optimizer';

describe('StylableOptimizer', () => {
    it('removeComments', () => {
        const ast = postcss.parse(`
                /* comment 1 */
                .a { /* comment 2 */ }
                /* comment 3 */
            `);

        removeCommentNodes(ast);

        expect(ast.toString().trim()).to.equal(`.a { }`);
    });

    it('removeComments in decls', () => {
        const ast = postcss.parse(`
                .a { color: red /* red */ green }
            `);

        removeCommentNodes(ast);

        expect(ast.toString().trim()).to.equal(`.a { color: red  green }`);
    });

    it('removeUnusedComponents', () => {
        const index = '/index.st.css';
        const files = {
            [index]: {
                content: `
                    .x{color: red}
                `,
            },
        };

        const result = generateStylableResult({ entry: index, files });
        const usageMapping = {
            [result.meta.namespace]: false,
        };

        new StylableOptimizer().optimize({ removeUnusedComponents: true }, result, usageMapping);

        expect(result.meta.targetAst!.toString().trim()).to.equal('');
    });

    it('minifyCSS', () => {
        const index = '/index.st.css';
        const files = {
            [index]: {
                content: `
                    .x{/* empty */}
                    .x{color: /* empty */ red}
                    @media screen {
                        .x{/* empty */}
                    }
                    .y {
                        .z{color:green;}
                        @media screen {
                            &::before {}
                        }
                    }
                `,
            },
        };
        const { meta } = generateStylableResult({ entry: index, files });
        const output = new StylableOptimizer().minifyCSS(meta.targetAst!.toString());
        expect(output).to.equal(
            `.${meta.namespace}__x{color:red}.${meta.namespace}__y{& .${meta.namespace}__z{color:green}}`,
        );
    }).timeout(25000);
});
