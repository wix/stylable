import * as chai from "chai";
import { generateStylableOutput } from "../utils/generate-test-util";
const expect = chai.expect;

describe('emit-css: base', () => {

    it('should output used file as css bundle', () => {
        const output = generateStylableOutput({
            entry: '/entry.st.css',
            usedFiles: [
                '/entry.st.css'
            ],
            files: {
                "/entry.st.css": {
                    namespace: 'entry',
                    content: `
                        .b { color:green; } 
                    `
                }
            }
        });

        expect(output).to.eql(`.entry--root .entry--b { color:green; }`);
    });

    it('should output according to import order (entry strongest - bottom of CSS)', () => {
        const output = generateStylableOutput({
            entry: '/entry.st.css',
            usedFiles: [
                '/entry.st.css',
                '/comp.st.css'
            ],
            files: {
                "/entry.st.css": {
                    namespace: 'entry',
                    content: `
                        .a { color:red; } 
                    `
                },
                "/comp.st.css": {
                    namespace: 'comp',
                    content: `
                        .b { color:green; } 
                    `
                }
            }

        });

        expect(output).to.eql([
            `.comp--root .comp--b { color:green; }`,

            `.entry--root .entry--a { color:red; }`
        ].join('\n'));
    });

    it('should ignore js imports', () => {
        const output = generateStylableOutput({
            entry: '/entry.st.css',
            usedFiles: [
                '/entry.st.css'
            ],
            files: {
                "/entry.st.css": {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-from: './script';
                            -st-default: scriptExport;
                        }
                        .b { color:green; } 
                    `
                },
                "/script.js": {
                    content: ``
                }
            }
        });

        expect(output).to.eql(`.entry--root .entry--b { color:green; }`);
    });

    it('should not output un-used file', () => {
        const output = generateStylableOutput({
            entry: '/entry.st.css',
            usedFiles: [
                '/entry.st.css'
            ],
            files: {
                "/entry.st.css": {
                    namespace: 'entry',
                    content: `
                        .a { color:gold; }
                    `
                },
                "/unused-comp.st.css": {
                    namespace: 'unusedComp',
                    content: `
                        .c { color:red; } 
                    `
                }
            }

        });

        expect(output).to.eql([
            `.entry--root .entry--a { color:gold; }`
        ].join('\n'));
    });

    it('should output selectors which contain used files roots', () => {
        const output = generateStylableOutput({
            entry: '/entry.st.css',
            usedFiles: [
                '/entry.st.css',
                '/used-comp.st.css'
            ],
            files: {
                "/entry.st.css": {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-from: './used-comp.st.css';
                            -st-default: UsedComp;
                        }
                        UsedComp { color: red; }
                        .a { 
                            -st-extends: UsedComp;
                            color: green; 
                        }
                        .b.a { color: blue; }
                        .b UsedComp { color: black; }
                    `
                },
                "/used-comp.st.css": {
                    namespace: 'usedComp',
                    content: `
                        .root { color: red; } 
                    `
                }
            }

        });

        expect(output).to.eql([
            `.usedComp--root { color: red; }`,

            `.entry--root .usedComp--root { color: red; }`,
            `.entry--root .entry--a.usedComp--root { \n    -st-extends: UsedComp;\n    color: green; \n}`,
            `.entry--root .entry--b.entry--a.usedComp--root { color: blue; }`,
            `.entry--root .entry--b .usedComp--root { color: black; }`
        ].join('\n'));
    });

    it('should not output selectors which contain un-used files roots', () => {
        const output = generateStylableOutput({
            entry: '/entry.st.css',
            usedFiles: [
                '/entry.st.css'
            ],
            files: {
                "/entry.st.css": {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-from: './unused-comp.st.css';
                            -st-default: UnusedComp;
                        }
                        UnusedComp { color: red; }
                        .a { 
                            -st-extends: UnusedComp;
                            color: green; 
                        }
                        .b.a { color: blue; }
                        .b UnusedComp { color: black; }

                        .c { color:gold; }
                    `
                },
                "/unused-comp.st.css": {
                    namespace: 'unusedComp',
                    content: `
                        .root { color:red; } 
                    `
                }
            }

        });

        expect(output).to.eql([
            `.entry--root .entry--c { color:gold; }`
        ].join('\n'));
    });

})
