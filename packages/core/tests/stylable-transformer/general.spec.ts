import { expect } from 'chai';
import * as postcss from 'postcss';
import { generateStylableRoot } from '../utils/generate-test-util';

describe('Stylable postcss transform (General)', () => {

    it('should output empty on empty input', () => {

        const result = generateStylableRoot({
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

        const result = generateStylableRoot({
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
                '/a/test.st.css': {
                    content: ''
                }
            }
        });

        expect(result.nodes!.length, 'remove all imports').to.equal(0);

    });

    it('should not output :vars', () => {

        const result = generateStylableRoot({
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

    it('should support multiple selectors/properties with same name', () => {

        const result = generateStylableRoot({
            entry: `/a/b/style.st.css`,
            files: {
                '/a/b/style.st.css': {
                    content: `
                        .root {
                            color: red;
                            color: blue;
                        }
                        .root {
                            color: red;
                            color: blue;
                        }
                    `
                }
            }
        });

        const rule = result.nodes![0] as postcss.Rule;
        expect(rule.nodes![0].toString(), 'color1').to.equal('color: red');
        expect(rule.nodes![1].toString(), 'color1').to.equal('color: blue');

        const rule2 = result.nodes![1] as postcss.Rule;
        expect(rule2.nodes![0].toString(), 'color1').to.equal('color: red');
        expect(rule2.nodes![1].toString(), 'color1').to.equal('color: blue');

    });

});
