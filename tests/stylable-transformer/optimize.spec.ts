import { expect } from "chai";
import * as postcss from "postcss";
import { generateStylableRoot } from "../utils/generate-test-util";

describe('Generator variables interpolation', function () {


    it('should remove -st- declarations', function () {

        var result = generateStylableRoot({
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

        const rule = <postcss.Rule>result.nodes![0];

        expect((<postcss.Declaration>rule.nodes![0]).value).to.equal('red');
        expect((<postcss.Declaration>rule.nodes![1])).to.be.undefined;

    });

    it('should remove empty rules', function () {

        var result = generateStylableRoot({
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

        const rule = <postcss.Rule>result.nodes![0];

        expect(rule).to.be.undefined;

    });


    it('should remove empty rules and parent that remain empty', function () {

        var result = generateStylableRoot({
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

        const rule = <postcss.Rule>result.nodes![0];

        expect(rule).to.be.undefined;

    });

    it('should remove rule if all declarations are removed', function () {

        var result = generateStylableRoot({
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

        const rule = <postcss.Rule>result.nodes![0];

        expect(rule).to.be.undefined;

    });


    it('should remove rule if all declarations are removed and remove its parent when remain empty', function () {

        var result = generateStylableRoot({
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

        const rule = <postcss.Rule>result.nodes![0];

        expect(rule).to.be.undefined;

    });

});
