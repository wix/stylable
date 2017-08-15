import { expect } from "chai";

import { generateStylableRoot } from "../utils/generate-test-util";

describe('Stylable postcss transform (General)', function () {

    it('should output empty on empty input', () => {

        var result = generateStylableRoot({
            entry: `/style.st.css`,
            files: {
                '/style.st.css': {
                    content: ''
                }
            }
        });

        expect(result.toString()).to.equal('');

    });

    it('should not output :import', () => {

        var result = generateStylableRoot({
            entry: `/a/b/style.st.css`,
            files: {
                '/a/b/style.st.css': {
                    content: `
                        :import{
                            -st-from: "../test.st.css";
                            -st-default: name;
                        }
                    `
                },
                "/a/test.st.css": {
                    content: ''
                }
            }
        });

        expect(result.nodes!.length, 'remove all imports').to.equal(0);

    });

    it('should not output :vars', () => {

        var result = generateStylableRoot({
            entry: `/a/b/style.st.css`,
            files: {
                '/a/b/style.st.css': {
                    content: `
                        :vars {
                            myvar: red;
                        }
                    `
                }
            }
        });

        expect(result.nodes!.length, 'remove all vars').to.equal(0);

    });


});

