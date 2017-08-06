import { expect } from "chai";
import * as postcss from "postcss";
import { generateFromConfig } from "../utils/generate-test-util";

describe('Stylable postcss transform (Scoping)', function () {

    it('scope local classes', () => {

        var result = generateFromConfig({
            entry: `/style.st.css`,
            files: {
                '/style.st.css': {
                    namespace: 'ns',
                    content: `
                            .a {}
                            .b, .c {}
                        `
                }
            }
        });

        expect((<postcss.Rule>result.nodes![0]).selector).to.equal('.ns--root .ns--a');
        expect((<postcss.Rule>result.nodes![1]).selector).to.equal('.ns--root .ns--b, .ns--root .ns--c');

    });

    it('scope selector that extends anther style', () => {

        var result = generateFromConfig({
            entry: `/style.st.css`,
            files: {
                '/style.st.css': {
                    namespace: 'ns',
                    content: `
                            :import{
                                -st-from: "./imported.st.css";
                                -st-default: Container;
                            }
                            .a {
                                -st-extends: Container;
                            }
                        `
                },
                '/imported.st.css': {
                    namespace: 'ns1',
                    content: '',
                }
            }
        });

        expect((<postcss.Rule>result.nodes![0]).selector).to.equal('.ns--root .ns--a.ns1--root');

    });

    it('TODO: what to do?', () => {

        var result = generateFromConfig({
            entry: `/style.st.css`,
            files: {
                '/style.st.css': {
                    namespace: 'ns',
                    content: `
                            :import{
                                -st-from: "./imported.st.css";
                                -st-named: b;
                            }
                            .a {
                                -st-extends: b;
                            }
                        `
                },
                '/imported.st.css': {
                    namespace: 'ns1',
                    content: `
                        .b {

                        }
                    `,
                }
            }
        });

        expect((<postcss.Rule>result.nodes![0]).selector).to.equal('.ns--root .ns--a .ns1--b');

    });

});

