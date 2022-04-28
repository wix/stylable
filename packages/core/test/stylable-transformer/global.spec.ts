import { generateStylableResult } from '@stylable/core-test-kit';
import { expect } from 'chai';
import type * as postcss from 'postcss';

describe('Stylable postcss transform (Global)', () => {
    it('should register to all global classes to "meta.globals"', () => {
        const { meta } = generateStylableResult({
            entry: `/style.st.css`,
            files: {
                '/style.st.css': {
                    namespace: 'style',
                    content: `
                        @st-import [test] from './imported.st.css';
                        .root {}
                        .test {}
                        .x { -st-global: '.a .b'; }
                        :global(.c .d) {}
                        :global(.e) {}
                    `,
                },
                '/imported.st.css': {
                    namespace: 'mixin',
                    content: `
                        .test {
                            -st-global: ".global-test";
                        }
                    `,
                },
            },
        });

        expect(meta.globals).to.eql({
            'global-test': true,
            a: true,
            b: true,
            c: true,
            d: true,
            e: true,
        });
        expect((meta.outputAst!.nodes[1] as postcss.Rule).selector).to.equal('.global-test');
        expect((meta.outputAst!.nodes[2] as postcss.Rule).selector).to.equal('.a .b');
        expect((meta.outputAst!.nodes[3] as postcss.Rule).selector).to.equal('.c .d');
        expect((meta.outputAst!.nodes[4] as postcss.Rule).selector).to.equal('.e');
    });
});
