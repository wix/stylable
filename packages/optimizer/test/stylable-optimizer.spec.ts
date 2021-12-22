import { expect } from 'chai';
import * as postcss from 'postcss';
import deindent from 'deindent';
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

        new StylableOptimizer().optimize(
            { removeUnusedComponents: true },
            result,
            usageMapping,
            '__'
        );

        expect(result.meta.outputAst!.toString().trim()).to.equal('');
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
                `,
            },
        };
        const { meta } = generateStylableResult({ entry: index, files });
        const output = new StylableOptimizer().minifyCSS(meta.outputAst!.toString());
        expect(output).to.equal(`.${meta.namespace}__x{color:red}`);
    }).timeout(25000);

    it('preserve white space on string tokens ', () => {
        const index = '/index.st.css';
        const files = {
            [index]: {
                content: `
                    .x {
                        border: 1px solid "color(xxx)";
                    }
                `,
            },
        };
        const { meta } = generateStylableResult({ entry: index, files });
        const output = new StylableOptimizer().minifyCSS(meta.outputAst!.toString());
        expect(output).to.equal(`.${meta.namespace}__x{border:1px solid "color(xxx)"}`);
    });
});
