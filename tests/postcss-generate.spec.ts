import { expect } from "chai";
import { process, StyleableMeta } from '../src/postcss-process';
import { cachedProcessFile } from '../src/cached-process-file';
import * as postcss from 'postcss';
import { generate } from "../src/postcss-generate";
import { Pojo } from "../src/types";

interface File { content: string; mtime: Date; }
interface Config { entry: string, files: Pojo<File> }


function generateFromConfig(config: Config) {
    const from = config.entry;
    const files = config.files;
    const css = files[from].content.trim();

    const fileProcessor = cachedProcessFile<StyleableMeta>((from, content) => {
        return process(postcss.parse(content, { from }));
    },
        {
            readFileSync(path) {
                return files[path].content.trim();
            },
            statSync(path) {
                return files[path];
            }
        }
    )

    return generate(postcss.parse(css, { from }), { fileProcessor });
}

describe('Stylable postcss generate', function () {

    it('should output empty on empty input', () => {

        var result = generateFromConfig({
            entry: `/style.st.css`,
            files: {
                '/style.st.css': {
                    content: '',
                    mtime: new Date()
                }
            }
        });

        expect(result).to.equal('');

    });


    it('should not output :import', () => {

        var result = generateFromConfig({
            entry: `/a/b/style.st.css`,
            files: {
                '/a/b/style.st.css': {
                    content: `
                        :import{
                            -st-from: "../test.st.css";
                        }
                    `,
                    mtime: new Date()
                },
                "/a/test.st.css": {
                    content: '',
                    mtime: new Date()
                }
            }
        });

        expect(result).to.equal('');

    });

    it('should not output :vars', () => {

        var result = generateFromConfig({
            entry: `/a/b/style.st.css`,
            files: {
                '/a/b/style.st.css': {
                    content: `
                        :vars {
                            myvar: red;
                        }
                    `,
                    mtime: new Date()
                }
            }
        });

        expect(result).to.equal('');

    });


});

