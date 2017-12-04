"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var generate_test_util_1 = require("../utils/generate-test-util");
describe('Generator variables interpolation', function () {
    it('should remove -st- declarations', function () {
        var result = generate_test_util_1.generateStylableRoot({
            optimize: true,
            entry: "/entry.st.css",
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        .container {\n                            color: red;\n                            -st-a: red;\n                            -st-remove: yes;\n                        }\n                    "
                }
            }
        });
        var rule = result.nodes[0];
        chai_1.expect(rule.nodes[0].value).to.equal('red');
        chai_1.expect(rule.nodes[1]).to.equal(undefined);
    });
    it('should remove empty rules', function () {
        var result = generate_test_util_1.generateStylableRoot({
            optimize: true,
            entry: "/entry.st.css",
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                    .container {}\n                "
                }
            }
        });
        var rule = result.nodes[0];
        chai_1.expect(rule).to.equal(undefined);
    });
    it('should remove empty rules and parent that remain empty', function () {
        var result = generate_test_util_1.generateStylableRoot({
            optimize: true,
            entry: "/entry.st.css",
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        @media screen {\n                            .container {}\n                        }\n                    "
                }
            }
        });
        var rule = result.nodes[0];
        chai_1.expect(rule).to.equal(undefined);
    });
    it('should remove rule if all declarations are removed', function () {
        var result = generate_test_util_1.generateStylableRoot({
            optimize: true,
            entry: "/entry.st.css",
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        .container {\n                            -st-a: red;\n                            -st-remove: yes;\n                        }\n                    "
                }
            }
        });
        var rule = result.nodes[0];
        chai_1.expect(rule).to.equal(undefined);
    });
    it('should remove rule if all declarations are removed and remove its parent when remain empty', function () {
        var result = generate_test_util_1.generateStylableRoot({
            optimize: true,
            entry: "/entry.st.css",
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        @media screen {\n                            .container {\n                                -st-a: red;\n                                -st-remove: yes;\n                            }\n                        }\n                    "
                }
            }
        });
        var rule = result.nodes[0];
        chai_1.expect(rule).to.equal(undefined);
    });
});
//# sourceMappingURL=optimize.spec.js.map