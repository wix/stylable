import { expect } from 'chai';
import * as postcss from 'postcss';
import { processFormatters } from '../src/formatters';
import { process, SDecl } from '../src/stylable-processor';
import { generateStylableRoot } from './utils/generate-test-util';

function processSource(source: string, options: postcss.ProcessOptions = {}) {
    return process(postcss.parse(source, options));
}

function processFormattersFromSource(source: string, options: postcss.ProcessOptions = {}) {
    const parsed = postcss.parse(source, options).nodes![0] as postcss.Rule;

    const formatters = parsed.nodes!.map((decl: any) => {
        return processFormatters(decl).stylable.formatters;
    });

    return formatters;
}

describe('Stylable formatters', () => {

    describe('parse', () => {

        it('should parse a rule with a formatter', () => {
            const result = processSource(`
            .root {
                color: darker();
            }
            `, {});

            const formatters = ((result.ast.nodes![0] as any).nodes[0] as SDecl).stylable.formatters;
            expect(formatters.length).to.equal(1);
            expect(formatters[0].name).to.equal('darker');
        });

        it('should parse a single formatter with no arguments', () => {
            const formatters = processFormattersFromSource(`
            .root {
                color: darker();
            }
            `, {});

            const firstDeclFormatters = formatters[0];
            expect(firstDeclFormatters.length).to.equal(1);
            expect(firstDeclFormatters[0].name).to.equal('darker');
        });

        it('should parse a formatter with another formatter passed as an argument', () => {
            const formatters = processFormattersFromSource(`
            .root {
                color: darker(lighter());
            }
            `, {});

            const firstDeclFormatters = formatters[0];
            expect(firstDeclFormatters.length).to.equal(2);
            expect(firstDeclFormatters[0].name).to.equal('lighter');
            expect(firstDeclFormatters[1].name).to.equal('darker');
        });

        it('should parse a formatter with a complex declaration', () => {
            const formatters = processFormattersFromSource(`
            .root {
                border: superBorder(biggerBorder(2px) solid darker(lighter()));
            }
            `, {});

            const firstDeclFormatters = formatters[0];
            expect(firstDeclFormatters.length).to.equal(4);
            expect(firstDeclFormatters[0].name).to.equal('biggerBorder');
            expect(firstDeclFormatters[1].name).to.equal('lighter');
            expect(firstDeclFormatters[2].name).to.equal('darker');
            expect(firstDeclFormatters[3].name).to.equal('superBorder');
        });

        it('should parse multiple declarations', () => {
            const formatters = processFormattersFromSource(`
            .root {
                border: 1px solid lighter(blue);
                background: darker(goldenrod);
            }
            `, {});

            const firstDeclFormatters = formatters[0];
            expect(firstDeclFormatters.length).to.equal(1);
            expect(firstDeclFormatters[0].name).to.equal('lighter');

            const secondDeclFormatters = formatters[1];
            expect(secondDeclFormatters.length).to.equal(1);
            expect(secondDeclFormatters[0].name).to.equal('darker');
        });
    });

    describe('transform', () => {
        it('apply simple js formatter with no arguments', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        content: `
                            :import {
                                -st-from: "./formatter";
                                -st-default: colorGreen;
                            }
                            .container {
                                background: colorGreen();
                            }
                        `
                    },
                    '/formatter.js': {
                        content: `
                            module.exports = function() {
                                return 'green';
                            }
                        `
                    }
                }
            });

            const rule = result.nodes![0] as postcss.Rule;
            expect(rule.nodes![0].toString()).to.equal('background: green');
        });

        it('apply simple js formatter with a single argument', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        content: `
                            :import {
                                -st-from: "./formatter";
                                -st-default: color;
                            }
                            .container {
                                background: color(green);
                            }
                        `
                    },
                    '/formatter.js': {
                        content: `
                            module.exports = function(color) {
                                return color;
                            }
                        `
                    }
                }
            });

            const rule = result.nodes![0] as postcss.Rule;
            expect(rule.nodes![0].toString()).to.equal('background: green');
        });

        it('apply simple js formatter with a multiple arguments', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        content: `
                            :import {
                                -st-from: "./formatter";
                                -st-default: myBorder;
                            }
                            .container {
                                border: myBorder(2px solid green);
                            }
                        `
                    },
                    '/formatter.js': {
                        content: `
                            module.exports = function(size, style, color) {
                                return size + " " + style + " " + color;
                            }
                        `
                    }
                }
            });

            const rule = result.nodes![0] as postcss.Rule;
            expect(rule.nodes![0].toString()).to.equal('border: 2px solid green');
        });

        it('apply simple js formatter with a nested formatter', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        content: `
                            :import {
                                -st-from: "./formatter";
                                -st-default: addSomePx;
                                -st-named: border;
                            }
                            .container {
                                border: border(addSomePx(1, 5) solid green);
                            }
                        `
                    },
                    '/formatter.js': {
                        content: `
                            module.exports = function(size, toAdd) {
                                return Number(size) + Number(toAdd) + 'px';
                            }
                            module.exports.border = function(size, style, color) {
                                return size + " " + style + " " + color;
                            }
                        `
                    }
                }
            });

            const rule = result.nodes![0] as postcss.Rule;
            expect(rule.nodes![0].toString()).to.equal('border: 6px solid green');
        });

        it('passes through cyclic vars', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        content: `
                            :import {
                                -st-from: "./formatter";
                                -st-default: print;
                            }
                            :vars {
                                a: value(b);
                                b: value(a);
                            }
                            .container {
                                border: print(print(value(a)));
                            }
                        `
                    },
                    '/formatter.js': {
                        content: `
                            module.exports = function(result) {
                                return result;
                            }
                        `
                    }
                }
            });

            const rule = result.nodes![0] as postcss.Rule;
            expect(rule.nodes![0].toString()).to.equal('border: cyclic-value');
        });
    });
});
