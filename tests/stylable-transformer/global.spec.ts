import { expect } from "chai";
import * as postcss from "postcss";
import { generateStylableRoot } from "../utils/generate-test-util";

describe('Stylable postcss transform (Global)', function () {
    
    it('should support :global()', () => {

        var result = generateStylableRoot({
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

        expect((<postcss.Rule>result.nodes![0]).selector).to.equal('.style--root .btn');
        expect((<postcss.Rule>result.nodes![1]).selector).to.equal('.btn');
        expect((<postcss.Rule>result.nodes![2]).selector).to.equal('.btn .style--container');

    });
});

