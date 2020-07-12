import { createStylableInstance } from '@stylable/core-test-kit';
import { expect } from 'chai';
import postcss from 'postcss';
import { removeCommentNodes, StylableOptimizer } from '../src/';
const deindent = require('deindent');
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

    it('removeStylableDirectives', () => {
        const ast = postcss.parse(deindent`
                .a {
                    -st-: 1;
                    -st-states: 2;
                }
                @media (max-width) {
                    .c {
                        -st-: 1;
                    }
                }
            `);

        (ast as any).cleanRaws(false);

        new StylableOptimizer().removeStylableDirectives(ast);

        expect(ast.toString()).to.equal(
            deindent`
                .a {}
                @media (max-width) {
                    .c {}
                }
            `.trim()
        );
    });

    it('removeUnusedComponents', () => {
        const index = 'index.st.css';
        const files = {
            [index]: {
                content: `
                    .x{color: red}
                `,
            },
        };

        const stylable = createStylableInstance({ files });
        const result = stylable.transform(files[index].content, index);
        const usageMapping = {
            [result.meta.namespace]: false,
        };

        new StylableOptimizer().optimize(
            { removeUnusedComponents: true },
            result,
            usageMapping,
            stylable.delimiter
        );

        expect(result.meta.outputAst!.toString().trim()).to.equal('');
    });

    it('minifyCSS', () => {
        const index = 'index.st.css';
        const files = {
            [index]: {
                content: `
                    .x{/* empty */}
                    .x{color: /* empty */ red}
                    @media screen {
                        .x{/* empty */}
                    }
                `,
            },
        };

        const stylable = createStylableInstance({ files });
        const { meta } = stylable.transform(files[index].content, index);
        const output = new StylableOptimizer().minifyCSS(meta.outputAst!.toString());
        expect(output).to.equal(`.${meta.namespace}__x{color:red}`);
    });
});
