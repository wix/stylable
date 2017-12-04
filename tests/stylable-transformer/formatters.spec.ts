import { expect } from 'chai';
import * as postcss from 'postcss';
import { processFormatters } from '../../src/formatters';
import { process, SDecl } from '../../src/stylable-processor';
// import { generateStylableRoot } from '../utils/generate-test-util';

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
            expect(formatters[0]).to.equal('darker');
        });

        it('should parse a single formatter with no arguments', () => {
            const formatters = processFormattersFromSource(`
            .root {
                color: darker();
            }
            `, {});

            const firstDeclFormatters = formatters[0];
            expect(firstDeclFormatters.length).to.equal(1);
            expect(firstDeclFormatters[0]).to.equal('darker');
        });

        it('should parse a formatter with another formatter passed as an argument', () => {
            const formatters = processFormattersFromSource(`
            .root {
                color: darker(lighter());
            }
            `, {});

            const firstDeclFormatters = formatters[0];
            expect(firstDeclFormatters.length).to.equal(2);
            expect(firstDeclFormatters[0]).to.equal('lighter');
            expect(firstDeclFormatters[1]).to.equal('darker');
        });

        it('should parse a formatter with a complex declaration', () => {
            const formatters = processFormattersFromSource(`
            .root {
                border: superBorder(biggerBorder(2px) solid darker(lighter()));
            }
            `, {});

            const firstDeclFormatters = formatters[0];
            expect(firstDeclFormatters.length).to.equal(4);
            expect(firstDeclFormatters[0]).to.equal('biggerBorder');
            expect(firstDeclFormatters[1]).to.equal('lighter');
            expect(firstDeclFormatters[2]).to.equal('darker');
            expect(firstDeclFormatters[3]).to.equal('superBorder');
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
            expect(firstDeclFormatters[0]).to.equal('lighter');

            const secondDeclFormatters = formatters[1];
            expect(secondDeclFormatters.length).to.equal(1);
            expect(secondDeclFormatters[0]).to.equal('darker');
        });
    });

    // describe('transform', () => {
    //     xit('apply simple js formatter', () => {
    //         const result = generateStylableRoot({
    //             entry: `/style.st.css`,
    //             files: {
    //                 '/style.st.css': {
    //                     content: `
    //                         :import {
    //                             -st-from: "./formatter";
    //                             -st-default: formatter;
    //                         }
    //                         .container {
    //                             background: formatter(green);
    //                         }
    //                     `
    //                 },
    //                 '/formatter.js': {
    //                     content: `
    //                         module.exports = function() {
    //                             return {
    //                                 color: "red"
    //                             }
    //                         }
    //                     `
    //                 }
    //             }
    //         });

    //         const rule = result.nodes![0] as postcss.Rule;
    //         expect(rule.nodes![0].toString()).to.equal('color: red');
    //     });

    // });

});
