import { expect } from 'chai';
import * as postcss from 'postcss';
import { generateStylableRoot } from '../utils/generate-test-util';

describe('scoping-edge-cases', () => {

    it('root scoping always uses origin meta', () => {

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

                        .x {
                            -st-extends: Comp;
                        }

                        .x::part::inner {

                        }

                    `
                },
                '/comp.st.css': {
                    namespace: 'comp',
                    content: `
                        :import {
                            -st-from: "./inner.st.css";
                            -st-default: Inner;
                        }
                        .part {
                            -st-extends: Inner;
                        }
                    `
                },
                '/inner.st.css': {
                    namespace: 'inner',
                    content: `
                        .inner {

                        }
                    `
                }
            }
        });

        expect((result.nodes![1] as postcss.Rule).selector).to.equal(
            '.style--x.comp--root .comp--part .inner--inner'
        );

    });

    it('meta from pseudo-elements leak into the next selector', () => {

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

                        .x {
                            -st-states: test;
                            -st-extends: Comp;
                        }

                        .x::part::inner, .x:test {

                        }

                    `
                },
                '/comp.st.css': {
                    namespace: 'comp',
                    content: `
                        :import {
                            -st-from: "./inner.st.css";
                            -st-default: Inner;
                        }
                        .root{
                            -st-states: test;
                        }
                        .part {
                            -st-extends: Inner;
                        }
                    `
                },
                '/inner.st.css': {
                    namespace: 'inner',
                    content: `
                        .root{
                            -st-states: test;
                        }
                        .inner {

                        }
                    `
                }
            }
        });

        expect((result.nodes![1] as postcss.Rule).selector).to.equal(
            '.style--x.comp--root .comp--part .inner--inner, .style--x.comp--root[data-style-test]'
        );

    });

});
