import { expect } from 'chai';
import * as postcss from 'postcss';
import { generateStylableResult, generateStylableRoot } from '../utils/generate-test-util';

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

    it('should register to all global classes to "meta.globals"', () => {

        const { meta } = generateStylableResult({
            entry: `/style.st.css`,
            files: {
                '/style.st.css': {
                    namespace: 'style',
                    content: `
                        :import {
                            -st-from: "./mixin.st.css";
                            -st-named: test;
                        }
                        .root {}
                        .test {}
                        .x { -st-global: '.a .b'; }
                        :global(.c .d) {}
                        :global(.e) {}
                    `
                },
                '/mixin.st.css': {
                    namespace: 'mixin',
                    content: `
                        .test {
                            -st-global: ".global-test";
                        }
                    `
                }
            }
        });

        expect(meta.globals).to.eql({
            'global-test': true,
            'a': true,
            'b': true,
            'c': true,
            'd': true,
            'e': true
        });
        expect((meta.outputAst!.nodes![1] as postcss.Rule).selector).to.equal('.global-test');
        expect((meta.outputAst!.nodes![2] as postcss.Rule).selector).to.equal('.a .b');
        expect((meta.outputAst!.nodes![3] as postcss.Rule).selector).to.equal('.c .d');
        expect((meta.outputAst!.nodes![4] as postcss.Rule).selector).to.equal('.e');
    });
});
