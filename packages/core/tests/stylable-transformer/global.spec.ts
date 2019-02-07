import { generateStylableRoot } from '@stylable/core-test-kit';
import { expect } from 'chai';
import * as postcss from 'postcss';

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

    it('should support :global() as mixin', () => {

        const result = generateStylableRoot({
            entry: `/style.st.css`,
            files: {
                '/style.st.css': {
                    namespace: 'style',
                    content: `
                        :import {
                            -st-from: "./comp.st.css";
                            -st-default: Comp;
                        }
                        .root {
                            -st-mixin: Comp;
                        }
                    `
                },
                '/comp.st.css': {
                    namespace: 'comp',
                    content: `
                        :global(.btn) .root {}
                    `
                }
            }
        });

        expect((result.nodes![1] as postcss.Rule).selector).to.equal('.btn .style--root');

    });

    it('should support nested :global() as mixin', () => {

        const result = generateStylableRoot({
            entry: `/style.st.css`,
            files: {
                '/style.st.css': {
                    namespace: 'style',
                    content: `
                        :import {
                            -st-from: "./mixin.st.css";
                            -st-default: Mixin;
                        }
                        .root {
                            -st-mixin: Mixin;
                        }
                    `
                },
                '/mixin.st.css': {
                    namespace: 'mixin',
                    content: `
                        :import {
                            -st-from: "./comp.st.css";
                            -st-default: Comp;
                        }
                        .root {
                            -st-mixin: Comp;
                        }
                    `
                },
                '/comp.st.css': {
                    namespace: 'comp',
                    content: `
                        :global(.btn) .root {}
                    `
                }
            }
        });

        expect((result.nodes![1] as postcss.Rule).selector).to.equal('.btn .style--root');

    });
});
