"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var generate_test_util_1 = require("../utils/generate-test-util");
describe('Stylable mixins', function () {
    it('apply simple js mixin', function () {
        var result = generate_test_util_1.generateStylableRoot({
            entry: "/style.st.css",
            files: {
                '/style.st.css': {
                    content: "\n                        :import {\n                            -st-from: \"./mixin\";\n                            -st-default: mixin;\n                        }\n                        .container {\n                            background: green;\n                            -st-mixin: mixin;\n                            border: 0;\n                        }\n                    "
                },
                '/mixin.js': {
                    content: "\n                        module.exports = function() {\n                            return {\n                                color: \"red\"\n                            }\n                        }\n                    "
                }
            }
        });
        var rule = result.nodes[0];
        chai_1.expect(rule.nodes[1].toString()).to.equal('color: red');
    });
    it('apply simple js mixin and remove all -st-mixins', function () {
        var result = generate_test_util_1.generateStylableRoot({
            entry: "/style.st.css",
            files: {
                '/style.st.css': {
                    content: "\n                        :import {\n                            -st-from: \"./mixin\";\n                            -st-default: mixin;\n                        }\n                        .container {\n                            -st-mixin: mixin;\n                            -st-mixin: mixin;\n                            -st-mixin: mixin;\n                        }\n                    "
                },
                '/mixin.js': {
                    content: "\n                        module.exports = function() {\n                            return {\n                                color: \"red\"\n                            }\n                        }\n                    "
                }
            }
        });
        var rule = result.nodes[0];
        chai_1.expect(rule.nodes[0].toString()).to.equal('color: red');
    });
    it('apply complex js mixin', function () {
        var result = generate_test_util_1.generateStylableRoot({
            entry: "/entry.st.css",
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        :import {\n                            -st-from: \"./mixin\";\n                            -st-default: mixin;\n                        }\n                        .container {\n                            -st-mixin: mixin;\n                            -st-mixin: mixin;\n                            -st-mixin: mixin;\n                        }\n                        .containerB {\n                            color: blue;\n                        }\n                    "
                },
                '/mixin.js': {
                    content: "\n                        module.exports = function() {\n                            return {\n                                color: \"red\",\n                                \".my-selector\": {\n                                    color: \"green\",\n                                    \"&:hover\": {\n                                        background: \"yellow\"\n                                    }\n                                },\n                                \"&:hover\": {\n                                    color: \"gold\"\n                                }\n                            }\n                        }\n                    "
                }
            }
        });
        var rule = result.nodes[0];
        chai_1.expect(rule.selector, 'rule 1 selector').to.equal('.entry--root .entry--container');
        chai_1.expect(rule.nodes[0].toString(), 'rule 1 decl').to.equal('color: red');
        var rule2 = result.nodes[1];
        chai_1.expect(rule2.selector, 'rule 2 selector').to.equal('.entry--root .entry--container .entry--my-selector');
        chai_1.expect(rule2.nodes[0].toString(), 'rule 2 decl').to.equal('color: green');
        var rule3 = result.nodes[2];
        chai_1.expect(rule3.selector, 'rule 3 selector').to.equal('.entry--root .entry--container .entry--my-selector:hover');
        chai_1.expect(rule3.nodes[0].toString(), 'rule 3 decl').to.equal('background: yellow');
        var rule4 = result.nodes[3];
        chai_1.expect(rule4.selector, 'rule 4 selector').to.equal('.entry--root .entry--container:hover');
        chai_1.expect(rule4.nodes[0].toString(), 'rule 4 decl').to.equal('color: gold');
    });
    it('apply js mixin on multiple selectors', function () {
        var result = generate_test_util_1.generateStylableRoot({
            entry: "/entry.st.css",
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        :import {\n                            -st-from: \"./mixin\";\n                            -st-default: mixin;\n                        }\n                        .containerA, .containerB {\n                            -st-mixin: mixin;\n\n                        }\n                    "
                },
                '/mixin.js': {
                    content: "\n                        module.exports = function() {\n                            return {\n                                color: \"red\",\n                                \"&:hover\": {\n                                    color: \"green\"\n                                }\n                            }\n                        }\n                    "
                }
            }
        });
        var rule = result.nodes[0];
        chai_1.expect(rule.selector, 'rule 1 selector')
            .to.equal('.entry--root .entry--containerA, .entry--root .entry--containerB');
        chai_1.expect(rule.nodes[0].toString(), 'rule 1').to.equal('color: red');
        var rule1 = result.nodes[1];
        chai_1.expect(rule1.selector, 'rule 2 selector')
            .to.equal('.entry--root .entry--containerA:hover, .entry--root .entry--containerB:hover');
        chai_1.expect(rule1.nodes[0].toString(), 'rule 2').to.equal('color: green');
    });
    it('apply js mixin with multiple selectors', function () {
        var result = generate_test_util_1.generateStylableRoot({
            entry: "/entry.st.css",
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        :import {\n                            -st-from: \"./mixin\";\n                            -st-default: mixin;\n                        }\n                        .containerA {\n                            -st-mixin: mixin;\n                        }\n                    "
                },
                '/mixin.js': {
                    content: "\n                        module.exports = function() {\n                            return {\n                                \"&:hover, .class\": {\n                                    color: \"green\"\n                                }\n                            }\n                        }\n                    "
                }
            }
        });
        var rule1 = result.nodes[1];
        chai_1.expect(rule1.selector, 'rule 2 selector')
            .to.equal('.entry--root .entry--containerA:hover, .entry--root .entry--containerA .entry--class');
        chai_1.expect(rule1.nodes[0].toString(), 'rule 2').to.equal('color: green');
    });
    it('apply js mixin with multiple var values', function () {
        var result = generate_test_util_1.generateStylableRoot({
            entry: "/entry.st.css",
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        :import {\n                            -st-from: \"./mixin\";\n                            -st-default: mixin;\n                        }\n                        :vars {\n                            color1: red;\n                            color2: blue;\n                        }\n                        .container {\n                            -st-mixin: mixin(value(color1), value(color2));\n                        }\n                    "
                },
                '/mixin.js': {
                    content: "\n                        module.exports = function(options) {\n                            return {\n                                color: options[0],\n                                background: options[1]\n                            }\n                        }\n                    "
                }
            }
        });
        var rule = result.nodes[0];
        chai_1.expect(rule.selector, 'rule 1 selector').to.equal('.entry--root .entry--container');
        chai_1.expect(rule.nodes[0].toString(), 'decl 1').to.equal('color: red');
        chai_1.expect(rule.nodes[1].toString(), 'decl 2').to.equal('background: blue');
    });
    it('apply js multiple mixins', function () {
        var result = generate_test_util_1.generateStylableRoot({
            entry: "/entry.st.css",
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        :import {\n                            -st-from: \"./mixin1\";\n                            -st-default: mixin1;\n                        }\n                        :import {\n                            -st-from: \"./mixin2\";\n                            -st-default: mixin2;\n                        }\n                        .container {\n                            -st-mixin: mixin1(red) mixin2(blue);\n                        }\n                    "
                },
                '/mixin1.js': {
                    content: "\n                        module.exports = function(options) {\n                            return {\n                                color: options[0]\n                            }\n                        }\n                    "
                },
                '/mixin2.js': {
                    content: "\n                        module.exports = function(options) {\n                            return {\n                                background: options[0]\n                            }\n                        }\n                    "
                }
            }
        });
        var rule = result.nodes[0];
        chai_1.expect(rule.selector, 'rule 1 selector').to.equal('.entry--root .entry--container');
        chai_1.expect(rule.nodes[0].toString(), 'decl 1').to.equal('color: red');
        chai_1.expect(rule.nodes[1].toString(), 'decl 2').to.equal('background: blue');
    });
    describe('class mixins', function () {
        it('apply simple class mixins declarations', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/entry.st.css",
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                        .my-mixin {\n                            color: red;\n                        }\n                        .container {\n                            -st-mixin: my-mixin;\n                        }\n                    "
                    }
                }
            });
            var rule = result.nodes[1];
            chai_1.expect(rule.selector, 'selector').to.equal('.entry--root .entry--container');
            chai_1.expect(rule.nodes[0].toString(), 'decl 1').to.equal('color: red');
        });
        it('append complex selector that starts with the mixin name', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/entry.st.css",
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                        .my-mixin {\n                            color: red;\n                        }\n                        .my-mixin:hover {\n                            color: blue;\n                        }\n                        .my-mixin .my-other-class {\n                            color: green;\n                        }\n                        .container {\n                            -st-mixin: my-mixin;\n                        }\n                    "
                    }
                }
            });
            var rule = result.nodes[4];
            chai_1.expect(rule.selector, 'selector').to.equal('.entry--root .entry--container:hover');
            chai_1.expect(rule.nodes[0].toString(), 'selector decl').to.equal('color: blue');
            var rule2 = result.nodes[5];
            chai_1.expect(rule2.selector, 'selector 2').to.equal('.entry--root .entry--container .entry--my-other-class');
            chai_1.expect(rule2.nodes[0].toString(), 'selector 2 decl').to.equal('color: green');
        });
        it('apply simple class mixins declarations from import', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/entry.st.css",
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                        :import {\n                            -st-from: \"./imported.st.css\";\n                            -st-named: my-mixin;\n                        }\n                        .container {\n                            -st-mixin: my-mixin;\n                        }\n                    "
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: "\n                        .my-mixin {\n                            color: red;\n                        }\n                    "
                    }
                }
            });
            var rule = result.nodes[0];
            chai_1.expect(rule.selector, 'selector').to.equal('.entry--root .entry--container');
            chai_1.expect(rule.nodes[0].toString(), 'decl 1').to.equal('color: red');
        });
    });
});
//# sourceMappingURL=mixins.spec.js.map