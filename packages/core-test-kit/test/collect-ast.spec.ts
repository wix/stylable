import { collectAst } from '@stylable/core-test-kit';
import { expect } from 'chai';
import * as postcss from 'postcss';

describe('collect-ast', () => {
    it('should collect nodes following comments that start with a provided prefix into buckets', () => {
        const ast = postcss.parse(`
            .not-collected {}

            /* @collect: ... */
            .collected-top-level {}

            /* @no-collect-comment: ... */
            .not-collected {}

            /* @collect: ... */
            @collected-at-rule {
                .not-collected {

                    /* @collect: ... */
                    collected-decl: green;

                    not-collected: red;

                    /* 2nd-bucket: ... */
                    collected-decl-2: yellow;
                }

                /* @collect: ... */
                .collected-nested {}
            }

            /* 2nd-bucket: ... */
            .collected-top-level-bucket-2 {}
        `);

        const actualNodes = collectAst(ast, ['@collect', '2nd-bucket']);
        const expectedBucketOne = [
            ast.nodes[2],
            ast.nodes[6],
            (ast.nodes[6] as any).nodes[0].nodes[1],
            (ast.nodes[6] as any).nodes[2],
        ];
        const expectedBucketTwo = [(ast.nodes[6] as any).nodes[0].nodes[4], ast.nodes[8]];

        expect(actualNodes['@collect'], 'bucket 1').to.eql(expectedBucketOne);
        expect(actualNodes['2nd-bucket'], 'bucket 2').to.eql(expectedBucketTwo);
    });
});
