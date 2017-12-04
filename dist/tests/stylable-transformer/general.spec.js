"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var generate_test_util_1 = require("../utils/generate-test-util");
describe('Stylable postcss transform (General)', function () {
    it('should output empty on empty input', function () {
        var result = generate_test_util_1.generateStylableRoot({
            entry: "/style.st.css",
            files: {
                '/style.st.css': {
                    content: ''
                }
            }
        });
        chai_1.expect(result.toString()).to.equal('');
    });
    it('should not output :import', function () {
        var result = generate_test_util_1.generateStylableRoot({
            entry: "/a/b/style.st.css",
            files: {
                '/a/b/style.st.css': {
                    content: "\n                        :import{\n                            -st-from: \"../test.st.css\";\n                            -st-default: name;\n                        }\n                    "
                },
                '/a/test.st.css': {
                    content: ''
                }
            }
        });
        chai_1.expect(result.nodes.length, 'remove all imports').to.equal(0);
    });
    it('should not output :vars', function () {
        var result = generate_test_util_1.generateStylableRoot({
            entry: "/a/b/style.st.css",
            files: {
                '/a/b/style.st.css': {
                    content: "\n                        :vars {\n                            myvar: red;\n                        }\n                    "
                }
            }
        });
        chai_1.expect(result.nodes.length, 'remove all vars').to.equal(0);
    });
    it('should support multiple selectors/properties with same name', function () {
        var result = generate_test_util_1.generateStylableRoot({
            entry: "/a/b/style.st.css",
            files: {
                '/a/b/style.st.css': {
                    content: "\n                        .root {\n                            color: red;\n                            color: blue;\n                        }\n                        .root {\n                            color: red;\n                            color: blue;\n                        }\n                    "
                }
            }
        });
        var rule = result.nodes[0];
        chai_1.expect(rule.nodes[0].toString(), 'color1').to.equal('color: red');
        chai_1.expect(rule.nodes[1].toString(), 'color1').to.equal('color: blue');
        var rule2 = result.nodes[1];
        chai_1.expect(rule2.nodes[0].toString(), 'color1').to.equal('color: red');
        chai_1.expect(rule2.nodes[1].toString(), 'color1').to.equal('color: blue');
    });
});
//# sourceMappingURL=general.spec.js.map