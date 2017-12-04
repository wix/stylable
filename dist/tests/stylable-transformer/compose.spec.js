"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
// import * as postcss from "postcss";
var generate_test_util_1 = require("../utils/generate-test-util");
describe('Exports (Compose)', function () {
    it('should compose class into another class or tag', function () {
        var cssExports = generate_test_util_1.generateStylableExports({
            entry: '/entry.st.css',
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        .a {}\n                        .b {\n                            -st-compose: a;\n                        }\n                    "
                }
            }
        });
        chai_1.expect(cssExports).to.eql({
            root: 'entry--root',
            a: 'entry--a',
            b: 'entry--b entry--a'
        });
    });
    it('should compose imported class into class', function () {
        var cssExports = generate_test_util_1.generateStylableExports({
            entry: '/entry.st.css',
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        :import {\n                            -st-from: \"./inner.st.css\";\n                            -st-named: b;\n                        }\n                        .a {\n                            -st-compose: b;\n                        }\n                    "
                },
                '/inner.st.css': {
                    namespace: 'inner',
                    content: "\n                        :import {\n                            -st-from: \"./deep.st.css\";\n                            -st-named: c;\n                        }\n                        .b {\n                            -st-compose: c;\n                        }\n                    "
                },
                '/deep.st.css': {
                    namespace: 'deep',
                    content: "\n                        .c {}\n                    "
                }
            }
        });
        chai_1.expect(cssExports).to.eql({
            root: 'entry--root',
            a: 'entry--a inner--b deep--c'
        });
    });
    it('should report when composing on anything but simple css selector and ignore', function () {
        // TODO: test it
    });
    it('should report if composing class to itself and ignore', function () {
        // TODO: test it
    });
    it('should support multiple compose values', function () {
        var cssExports = generate_test_util_1.generateStylableExports({
            entry: '/entry.st.css',
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        .a {}\n                        .b {}\n                        .c {\n                            -st-compose: a, b;\n                        }\n                    "
                }
            }
        });
        chai_1.expect(cssExports).to.eql({
            root: 'entry--root',
            a: 'entry--a',
            b: 'entry--b',
            c: 'entry--c entry--a entry--b'
        });
    });
    describe('compose by extends', function () {
        it('compose when extending class that is not root', function () {
            var cssExports = generate_test_util_1.generateStylableExports({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                        .a{}\n                        .b{\n                            -st-extends: a;\n                        }\n                    "
                    }
                }
            });
            chai_1.expect(cssExports).to.eql({
                root: 'entry--root',
                a: 'entry--a',
                b: 'entry--b entry--a'
            });
        });
    });
});
//# sourceMappingURL=compose.spec.js.map