import { expect } from 'chai';
import * as postcss from 'postcss';
import { removeCommentNodes, removeSTDirective, StylableOptimizer } from '../src/stylable-optimizer';
import { createStylableInstance } from './utils/generate-test-util';

describe('StylableOptimizer', () => {

    it('removeComments', () => {
        const ast = postcss.parse(`
                /* comment 1 */
                .a { /* comment 2 */ }
                /* comment 3 */
            `);

        new StylableOptimizer().removeComments(ast);

        expect(ast.toString().trim()).to.equal(`.a { }`)

    });

    it('removeStylableDirectives', () => {
        const ast = postcss.parse(`
                .a {
                    -st-: 1;
                    -st-states: 2;
                }
                .b {
                    color: red;
                    -st-: 1;
                    -st-states: 2;
                }
                @media (max-width) {
                    .c {
                        -st-: 1;
                    }
                    .d {}
                }
                .e {}
            `);

        (ast as any).cleanRaws(false);

        new StylableOptimizer().removeStylableDirectives(ast);

        expect(ast.toString().trim()).to.equal(`.b {\n    color: red\n}`);

    });

    it('removeUnusedComponents', () => {
        const index = 'index.st.css';
        const files = {
            [index]: {
                content: `
                    .x{color: red}
                `
            }
        };
        const stylable = createStylableInstance({ files });
        const { meta } = stylable.transform(files[index].content, index);

        new StylableOptimizer().removeUnusedComponents(stylable, meta, []);

        expect(meta.ast!.toString().trim()).to.equal('');
    });

});
