"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var generate_test_util_1 = require("../utils/generate-test-util");
describe('Generator variables interpolation', function () {
    it('should inline value() usage with and without quotes', function () {
        var result = generate_test_util_1.generateStylableRoot({
            entry: "/entry.st.css",
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        :vars {\n                            param: \"red\";\n                            param1: green;\n                        }\n                        .container {\n                            color: value(param);\n                            background: value(param1);\n                        }\n                        "
                }
            }
        });
        var rule = result.nodes[0];
        chai_1.expect(rule.nodes[0].value).to.equal('red');
        chai_1.expect(rule.nodes[1].value).to.equal('green');
    });
    it('should resolve value inside @media', function () {
        var result = generate_test_util_1.generateStylableRoot({
            entry: "/entry.st.css",
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        :vars {\n                            xxl: \"(max-width: 301px)\";\n                        }\n                        @media value(xxl) {}\n                        "
                }
            }
        });
        chai_1.expect(result.nodes[0].params).to.equal('(max-width: 301px)');
    });
    it('should resolve value() usage in variable declaration', function () {
        var result = generate_test_util_1.generateStylableRoot({
            entry: "/entry.st.css",
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        :vars {\n                            param2: red;\n                            param: value(param2);\n                        }\n                        .container {\n                            color: value(param);\n                        }\n                    "
                }
            }
        });
        var rule = result.nodes[0];
        chai_1.expect(rule.nodes[0].value).to.equal('red');
    });
    it('should resolve to recursive entry', function () {
        var result = generate_test_util_1.generateStylableRoot({
            entry: "/entry.st.css",
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        :vars {\n                            param2: value(param1);\n                            param: value(param2);\n                        }\n                        .container {\n                            color: value(param);\n                        }\n                    "
                }
            }
        });
        var rule = result.nodes[0];
        chai_1.expect(rule.nodes[0].value).to.equal('cyclic value');
    });
    it('should support imported vars', function () {
        var result = generate_test_util_1.generateStylableRoot({
            entry: "/entry.st.css",
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        :import {\n                            -st-from: './imported.st.css';\n                            -st-named: param1, param2;\n                        }\n                        :vars {\n                            param: value(param1);\n                        }\n                        .container {\n                            color: value(param);\n                            background-color: value(param2)\n                        }\n                    "
                },
                '/imported.st.css': {
                    namespace: 'imported',
                    content: "\n                        :vars {\n                            param1: red;\n                            param2: blue;\n                        }\n                    "
                }
            }
        });
        var rule = result.nodes[0];
        chai_1.expect(rule.nodes[0].value).to.equal('red');
        chai_1.expect(rule.nodes[1].value).to.equal('blue');
    });
    it('should support imported vars (deep)', function () {
        var result = generate_test_util_1.generateStylableRoot({
            entry: "/entry.st.css",
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        :import {\n                            -st-from: './imported.st.css';\n                            -st-named: param1, param2;\n                        }\n                        :vars {\n                            param: value(param1);\n                        }\n                        .container {\n                            color: value(param);\n                            background-color: value(param2)\n                        }\n                    "
                },
                '/imported.st.css': {
                    namespace: 'imported',
                    content: "\n                        :import {\n                            -st-from: './deep.st.css';\n                            -st-named: param0;\n                        }\n                        :vars {\n                            param1: value(param0);\n                            param2: blue;\n                        }\n                    "
                },
                '/deep.st.css': {
                    namespace: 'deep',
                    content: "\n                        :vars {\n                            param0: red;\n                        }\n                    "
                }
            }
        });
        var rule = result.nodes[0];
        chai_1.expect(rule.nodes[0].value).to.equal('red');
        chai_1.expect(rule.nodes[1].value).to.equal('blue');
    });
    xit('should resolve value() usage in mixin call', function () {
        // const env = defineStylableEnv([
        //     JS('./mixins.js', 'Mixins', {
        //         mixin(options: string[]) {
        //             return {
        //                 color: options[0],
        //             };
        //         },
        //         otherMixin(options: string[]) {
        //             return {
        //                 backgroundColor: options[0],
        //             };
        //         },
        //         noParamsMixin() {
        //             return {
        //                 borderColor: 'orange',
        //             };
        //         }
        //     }),
        //     CSS('./main.css', 'Main', `
        //         :import("./mixins.js") {
        //             -st-named: mixin, otherMixin, noParamsMixin;
        //         }
        //         :vars {
        //             param: red;
        //         }
        //         .container {
        //             -st-mixin: mixin(value(param)) noParamsMixin otherMixin(blue);
        //         }
        //     `)
        // ], {});
        // env.validate.output([
        //     '.Main__container {\n    background-color: blue\n}',
        //     '.Main__container {\n    border-color: orange\n}',
        //     '.Main__container {\n    color: red/*param*/\n}'
        // ]); // ToDo: fix order and combine into a single CSS ruleset
    });
});
//# sourceMappingURL=value.spec.js.map