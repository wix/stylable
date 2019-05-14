import { generateStylableResult, generateStylableRoot } from '@stylable/core-test-kit';
import { expect } from 'chai';
import postcss from 'postcss';

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

        expect((result.nodes![0] as postcss.Rule).selector).to.equal('.style__root .btn');
        expect((result.nodes![1] as postcss.Rule).selector).to.equal('.btn');
        expect((result.nodes![2] as postcss.Rule).selector).to.equal('.btn .style__container');
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

        expect((result.nodes![1] as postcss.Rule).selector).to.equal('.btn .style__root');
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

        expect((result.nodes![1] as postcss.Rule).selector).to.equal('.btn .style__root');
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
                            -st-named: test, mix;
                        }
                        .root {}
                        .test {}
                        .x { -st-global: '.a .b'; }
                        :global(.c .d) {}
                        :global(.e) {}
                        .mixIntoMe { -st-mixin: mix; }
                    `
                },
                '/mixin.st.css': {
                    namespace: 'mixin',
                    content: `
                        .test {
                            -st-global: ".global-test";
                        }

                        .mix :global(.global-test2) {}
                    `
                }
            }
        });

        expect(meta.globals).to.eql({
            'global-test': true,
            'global-test2': true,
            a: true,
            b: true,
            c: true,
            d: true,
            e: true
        });
        expect((meta.outputAst!.nodes![1] as postcss.Rule).selector).to.equal('.global-test');
        expect((meta.outputAst!.nodes![2] as postcss.Rule).selector).to.equal('.a .b');
        expect((meta.outputAst!.nodes![3] as postcss.Rule).selector).to.equal('.c .d');
        expect((meta.outputAst!.nodes![4] as postcss.Rule).selector).to.equal('.e');
        expect((meta.outputAst!.nodes![5] as postcss.Rule).selector).to.equal('.style__mixIntoMe');
        expect((meta.outputAst!.nodes![6] as postcss.Rule).selector).to.equal(
            '.style__mixIntoMe .global-test2'
        );
    });
});
