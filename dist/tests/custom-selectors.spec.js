"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var postcss = require("postcss");
var cached_process_file_1 = require("../src/cached-process-file");
var stylable_processor_1 = require("../src/stylable-processor");
var generate_test_util_1 = require("./utils/generate-test-util");
exports.loadFile = cached_process_file_1.cachedProcessFile(function (path, content) {
    return processSource(content, { from: path });
}, {
    readFileSync: function () {
        return '';
    },
    statSync: function () {
        return { mtime: new Date() };
    }
});
function processSource(source, options) {
    if (options === void 0) { options = {}; }
    return stylable_processor_1.process(postcss.parse(source, options));
}
describe('@custom-selector', function () {
    it('collect custom-selectors', function () {
        var from = '/path/to/style.css';
        var result = processSource("\n            @custom-selector :--icon .root > .icon;\n        ", { from: from });
        chai_1.expect(result.customSelectors[':--icon']).to.equal('.root > .icon');
    });
    it('expand custom-selector before process (reflect on ast)', function () {
        var from = '/path/to/style.css';
        var result = processSource("\n            @custom-selector :--icon .root > .icon;\n            :--icon, .class {\n                color: red;\n            }\n        ", { from: from });
        var r = result.ast.nodes[0];
        chai_1.expect(r.selector).to.equal('.root > .icon, .class');
        chai_1.expect(result.classes.icon).to.contain({ _kind: 'class', name: 'icon' });
    });
    it('expand custom-selector before process (reflect on ast when not written)', function () {
        var from = '/path/to/style.css';
        var result = processSource("\n            @custom-selector :--icon .root > .icon;\n        ", { from: from });
        chai_1.expect(result.classes.icon).to.contain({ _kind: 'class', name: 'icon' });
    });
    it('expand pseudo-element custom-selector in the owner context', function () {
        var ast = generate_test_util_1.generateStylableRoot({
            entry: '/entry.st.css',
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        :import {\n                            -st-from: \"./comp.st.css\";\n                            -st-default: Comp;\n                        }\n\n                        Comp::root-icon{\n                            color: blue;\n                        }\n                    "
                },
                '/comp.st.css': {
                    namespace: 'comp',
                    content: "\n                        @custom-selector :--root-icon .root > .icon;\n\n                        :--root-icon, .class {\n                            color: red;\n                        }\n                    "
                }
            }
        });
        var r = ast.nodes[0];
        chai_1.expect(r.selector).to.equal('.entry--root .comp--root > .comp--icon');
    });
    it('expand custom-selector in pseudo-element in the owner context', function () {
        var ast = generate_test_util_1.generateStylableRoot({
            entry: '/entry.st.css',
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        :import {\n                            -st-from: \"./comp.st.css\";\n                            -st-default: Comp;\n                        }\n\n                        Comp::root-icon::top{\n                            color: blue;\n                        }\n                    "
                },
                '/comp.st.css': {
                    namespace: 'comp',
                    content: "\n                        @custom-selector :--root-icon .root > .icon;\n                        :import {\n                            -st-from: \"./child.st.css\";\n                            -st-default: Child;\n                        }\n                        :--root-icon, .class {\n                            color: red;\n                        }\n\n                        .icon {\n                            -st-extends: Child;\n                        }\n                    "
                },
                '/child.st.css': {
                    namespace: 'child',
                    content: "\n                        .top {\n\n                        }\n                    "
                }
            }
        });
        var r = ast.nodes[0];
        chai_1.expect(r.selector).to.equal('.entry--root .comp--root > .comp--icon.child--root .child--top');
    });
    it('expand complex custom-selector in pseudo-element', function () {
        var ast = generate_test_util_1.generateStylableRoot({
            entry: '/entry.st.css',
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        :import {\n                            -st-from: \"./comp.st.css\";\n                            -st-default: Comp;\n                        }\n\n                        Comp::class-icon{\n                            color: blue;\n                        }\n                    "
                },
                '/comp.st.css': {
                    namespace: 'comp',
                    content: "\n                        @custom-selector :--class-icon .icon, .class;\n                    "
                }
            }
        });
        var r = ast.nodes[0];
        chai_1.expect(r.selector).to.equal('.entry--root .comp--root .comp--icon,.entry--root .comp--root .comp--class');
    });
    it('expand custom-selector when there is global root', function () {
        var ast = generate_test_util_1.generateStylableRoot({
            entry: '/entry.st.css',
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        :import {\n                            -st-from: \"./interface.st.css\";\n                            -st-default: Interface;\n                        }\n                        Interface::cc{\n                            color: blue;\n                        }\n                    "
                },
                '/interface.st.css': {
                    namespace: 'interface',
                    content: "\n                        :import{\n                            -st-from: \"./controls.st.css\";\n                            -st-default: Controls;\n                        }\n                        .root {\n                            -st-global: \".xxx\"\n                        }\n                        @custom-selector :--cc Controls;\n                    "
                },
                '/controls.st.css': {
                    namespace: 'controls',
                    content: "\n                        .root {\n                        }\n                    "
                }
            }
        });
        var r = ast.nodes[0];
        chai_1.expect(r.selector).to.equal('.entry--root .xxx .controls--root');
    });
});
//# sourceMappingURL=custom-selectors.spec.js.map