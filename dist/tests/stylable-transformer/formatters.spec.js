"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var postcss = require("postcss");
var formatters_1 = require("../../src/formatters");
var stylable_processor_1 = require("../../src/stylable-processor");
// import { generateStylableRoot } from '../utils/generate-test-util';
function processFormattersFromSource(source, options) {
    if (options === void 0) { options = {}; }
    var parsed = postcss.parse(source, options).nodes[0];
    var formatters = parsed.nodes.map(function (decl) {
        return formatters_1.processFormatters(decl).formatters;
    });
    return formatters;
}
function processSource(source, options) {
    if (options === void 0) { options = {}; }
    return stylable_processor_1.process(postcss.parse(source, options));
}
describe('Stylable formatters', function () {
    describe('parse', function () {
        it('should parse a rule with a formatter', function () {
            var result = processSource("\n            .root {\n                color: darker();\n            }\n            ", {});
            var firstDeclFormatters = result.ast.nodes[0].nodes[0].formatters;
            chai_1.expect(firstDeclFormatters.length).to.equal(1);
            chai_1.expect(firstDeclFormatters[0]).to.equal('darker');
        });
        it('should parse a single formatter with no arguments', function () {
            var formatters = processFormattersFromSource("\n            .root {\n                color: darker();\n            }\n            ", {});
            var firstDeclFormatters = formatters[0];
            chai_1.expect(firstDeclFormatters.length).to.equal(1);
            chai_1.expect(firstDeclFormatters[0]).to.equal('darker');
        });
        it('should parse a formatter with another formatter passed as an argument', function () {
            var formatters = processFormattersFromSource("\n            .root {\n                color: darker(lighter());\n            }\n            ", {});
            var firstDeclFormatters = formatters[0];
            chai_1.expect(firstDeclFormatters.length).to.equal(2);
            chai_1.expect(firstDeclFormatters[0]).to.equal('lighter');
            chai_1.expect(firstDeclFormatters[1]).to.equal('darker');
        });
        it('should parse a formatter with a complex declaration', function () {
            var formatters = processFormattersFromSource("\n            .root {\n                border: superBorder(biggerBorder(2px) solid darker(lighter()));\n            }\n            ", {});
            var firstDeclFormatters = formatters[0];
            chai_1.expect(firstDeclFormatters.length).to.equal(4);
            chai_1.expect(firstDeclFormatters[0]).to.equal('biggerBorder');
            chai_1.expect(firstDeclFormatters[1]).to.equal('lighter');
            chai_1.expect(firstDeclFormatters[2]).to.equal('darker');
            chai_1.expect(firstDeclFormatters[3]).to.equal('superBorder');
        });
        it('should parse multiple declarations', function () {
            var formatters = processFormattersFromSource("\n            .root {\n                border: 1px solid lighter(blue);\n                background: darker(goldenrod);\n            }\n            ", {});
            var firstDeclFormatters = formatters[0];
            chai_1.expect(firstDeclFormatters.length).to.equal(1);
            chai_1.expect(firstDeclFormatters[0]).to.equal('lighter');
            var secondDeclFormatters = formatters[1];
            chai_1.expect(secondDeclFormatters.length).to.equal(1);
            chai_1.expect(secondDeclFormatters[0]).to.equal('darker');
        });
    });
    // xit('apply simple js formatter', () => {
    //     const result = generateStylableRoot({
    //         entry: `/style.st.css`,
    //         files: {
    //             '/style.st.css': {
    //                 content: `
    //                     :import {
    //                         -st-from: "./formatter";
    //                         -st-default: formatter;
    //                     }
    //                     .container {
    //                         background: formatter(green);
    //                     }
    //                 `
    //             },
    //             '/formatter.js': {
    //                 content: `
    //                     module.exports = function() {
    //                         return {
    //                             color: "red"
    //                         }
    //                     }
    //                 `
    //             }
    //         }
    //     });
    //     const rule = result.nodes![0] as postcss.Rule;
    //     expect(rule.nodes![0].toString()).to.equal('color: red');
    // });
});
//# sourceMappingURL=formatters.spec.js.map