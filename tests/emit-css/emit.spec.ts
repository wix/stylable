import * as chai from "chai";
import { generateStylableOutput } from "../utils/generate-test-util";
const expect = chai.expect;

describe('emit-css: general', () => {

    describe('used files', () => {

        it('should output as bundle (one file)', () => {
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

        it('should output multiple files', () => {
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

        it('should not output unused files and selectors containing them even when imported through CSS', () => {
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
                                -st-from: './comp.st.css';
                                -st-default: Comp;
                            }
                            Comp { color:blue; }
                            .a { 
                                -st-extends: Comp;
                                color:red; 
                            }
                            .b .a { color: green; }
                            .b Comp { color: salmon; }
                            .b { color:gold; }
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
                `.entry--root .entry--b { color:gold; }`
            ].join('\n'));
        });

        it('should work with nested pseudo selectors', () => {
            const output = generateStylableOutput({
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            .container {
                                 -st-states: state;
                            }
                            .container:state {
                                background: green;
                            }
                            .container:not(:state) {
                                background: red;
                            }
                        `
                    }
                }
            });
            expect(output).to.eql([
                '.entry--root .entry--container {\n     -st-states: state;\n}',
                '.entry--root .entry--container[data-entry-state] {\n    background: green;\n}',
                '.entry--root .entry--container:not([data-entry-state]) {\n    background: red;\n}'
            ].join('\n'))
        })


    });

})
