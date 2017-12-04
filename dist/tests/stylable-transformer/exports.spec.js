"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var generate_test_util_1 = require("../utils/generate-test-util");
describe('Exports', function () {
    it('contain root exports', function () {
        var cssExports = generate_test_util_1.generateStylableExports({
            entry: '/entry.st.css',
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: ""
                }
            }
        });
        chai_1.expect(cssExports).to.eql({
            root: 'entry--root'
        });
    });
    it('contain local class exports', function () {
        var cssExports = generate_test_util_1.generateStylableExports({
            entry: '/entry.st.css',
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        .classA {}\n                        .classB {}\n                    "
                }
            }
        });
        chai_1.expect(cssExports).to.eql({
            root: 'entry--root',
            classA: 'entry--classA',
            classB: 'entry--classB'
        });
    });
    it('not contain global class exports', function () {
        var cssExports = generate_test_util_1.generateStylableExports({
            entry: '/entry.st.css',
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        :global(.classA) {}\n                    "
                }
            }
        });
        chai_1.expect(cssExports).to.eql({
            root: 'entry--root'
        });
    });
    it('not contain imported class', function () {
        var cssExports = generate_test_util_1.generateStylableExports({
            entry: '/entry.st.css',
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        :import {\n                            -st-from: \"./imported.st.css\";\n                            -st-named: my-class;\n                        }\n                    "
                },
                '/imported.st.css': {
                    namespace: 'imported',
                    content: "\n                        .my-class {}\n\n                    "
                }
            }
        });
        chai_1.expect(cssExports).to.eql({
            root: 'entry--root'
        });
    });
    it('contain used imported class', function () {
        var cssExports = generate_test_util_1.generateStylableExports({
            entry: '/entry.st.css',
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        :import {\n                            -st-from: \"./imported.st.css\";\n                            -st-named: my-class;\n                        }\n                        .my-class{}\n                    "
                },
                '/imported.st.css': {
                    namespace: 'imported',
                    content: "\n                        .my-class {}\n\n                    "
                }
            }
        });
        chai_1.expect(cssExports).to.eql({
            'root': 'entry--root',
            'my-class': 'imported--my-class'
        });
    });
    it('not contain imported class when only extended and compose it into the existing class', function () {
        var cssExports = generate_test_util_1.generateStylableExports({
            entry: '/entry.st.css',
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        :import {\n                            -st-from: \"./imported.st.css\";\n                            -st-named: my-class;\n                        }\n                        .local-class {\n                            -st-extends: my-class;\n                        }\n                    "
                },
                '/imported.st.css': {
                    namespace: 'imported',
                    content: "\n                        .my-class {}\n\n                    "
                }
            }
        });
        chai_1.expect(cssExports).to.eql({
            'root': 'entry--root',
            'local-class': 'entry--local-class imported--my-class'
        });
    });
    it('contain local vars', function () {
        var cssExports = generate_test_util_1.generateStylableExports({
            entry: '/entry.st.css',
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        :vars {\n                            color1: red;\n                        }\n\n                        "
                }
            }
        });
        chai_1.expect(cssExports).to.eql({
            root: 'entry--root',
            color1: 'red'
        });
    });
    it('not contain imported vars', function () {
        var cssExports = generate_test_util_1.generateStylableExports({
            entry: '/entry.st.css',
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        :import {\n                            -st-from: \"./imported.st.css\";\n                            -st-named: color1;\n                        }\n\n                    "
                },
                '/imported.st.css': {
                    namespace: 'imported',
                    content: "\n                        :vars {\n                            color1: red;\n                        }\n\n                    "
                }
            }
        });
        chai_1.expect(cssExports).to.eql({
            root: 'entry--root'
        });
    });
    it('not resolve imported vars value on exported var', function () {
        var cssExports = generate_test_util_1.generateStylableExports({
            entry: '/entry.st.css',
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        :import {\n                            -st-from: \"./imported.st.css\";\n                            -st-named: color1;\n                        }\n                        :vars {\n                            color2: value(color1);\n                        }\n\n                    "
                },
                '/imported.st.css': {
                    namespace: 'imported',
                    content: "\n                        :vars {\n                            color1: red;\n                        }\n\n                    "
                }
            }
        });
        chai_1.expect(cssExports).to.eql({
            root: 'entry--root',
            color2: 'red'
        });
    });
    it('contain local keyframe', function () {
        var cssExports = generate_test_util_1.generateStylableExports({
            entry: '/entry.st.css',
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        @keyframes name {\n\n                        }\n                    "
                }
            }
        });
        chai_1.expect(cssExports).to.eql({
            root: 'entry--root',
            name: 'entry--name'
        });
    });
});
//# sourceMappingURL=exports.spec.js.map