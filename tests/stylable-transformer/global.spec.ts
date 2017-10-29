import { expect } from 'chai';
import * as postcss from 'postcss';
import { generateStylableRoot } from '../utils/generate-test-util';

describe('Stylable postcss transform (Global)', () => {

    it('should support :global()', () => {

        const result = generateStylableRoot({
            entry: `/a/b/style.st.css`,
            files: {
                '/a/b/style.st.css': {
                    namespace: 'style',
                    content: `
                        .root :global(.btn) {}
                        :global(.btn) {}
                        :global(.btn) .container {}
                    `
                }
            }
        });

        expect((result.nodes![0] as postcss.Rule).selector).to.equal('.style--root .btn');
        expect((result.nodes![1] as postcss.Rule).selector).to.equal('.btn');
        expect((result.nodes![2] as postcss.Rule).selector).to.equal('.btn .style--container');

    });
});
