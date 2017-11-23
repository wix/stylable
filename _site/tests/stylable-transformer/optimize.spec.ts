import { expect } from 'chai';
import * as postcss from 'postcss';
import { generateStylableRoot } from '../utils/generate-test-util';

describe('Generator variables interpolation', () => {

    it('should remove -st- declarations', () => {

        const result = generateStylableRoot({
            optimize: true,
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        .container {
                            color: red;
                            -st-a: red;
                            -st-remove: yes;
                        }
                    `
                }
            }
        });

        const rule = result.nodes![0] as postcss.Rule;

        expect((rule.nodes![0] as postcss.Declaration).value).to.equal('red');
        expect((rule.nodes![1] as postcss.Declaration)).to.equal(undefined);

    });

    it('should remove empty rules', () => {

        const result = generateStylableRoot({
            optimize: true,
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                    .container {}
                `
                }
            }
        });

        const rule = result.nodes![0] as postcss.Rule;

        expect(rule).to.equal(undefined);

    });

    it('should remove empty rules and parent that remain empty', () => {

        const result = generateStylableRoot({
            optimize: true,
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        @media screen {
                            .container {}
                        }
                    `
                }
            }
        });

        const rule = result.nodes![0] as postcss.Rule;

        expect(rule).to.equal(undefined);

    });

    it('should remove rule if all declarations are removed', () => {

        const result = generateStylableRoot({
            optimize: true,
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        .container {
                            -st-a: red;
                            -st-remove: yes;
                        }
                    `
                }
            }
        });

        const rule = result.nodes![0] as postcss.Rule;

        expect(rule).to.equal(undefined);

    });

    it('should remove rule if all declarations are removed and remove its parent when remain empty', () => {

        const result = generateStylableRoot({
            optimize: true,
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        @media screen {
                            .container {
                                -st-a: red;
                                -st-remove: yes;
                            }
                        }
                    `
                }
            }
        });

        const rule = result.nodes![0] as postcss.Rule;

        expect(rule).to.equal(undefined);

    });

});
