"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var generate_test_util_1 = require("../utils/generate-test-util");
describe('bundle: base', function () {
    it('should output used file as css bundle', function () {
        var output = generate_test_util_1.generateStylableOutput({
            entry: '/entry.st.css',
            usedFiles: [
                '/entry.st.css'
            ],
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        .b { color:green; }\n                    "
                }
            }
        });
        chai_1.expect(output).to.eql(".entry--root .entry--b { color:green; }");
    });
    it('should support unresolveable vars', function () {
        var output = generate_test_util_1.generateStylableOutput({
            entry: '/entry.st.css',
            usedFiles: [
                '/entry.st.css'
            ],
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        :import {\n                            -st-from: \"./theme.st.css\";\n                            -st-named: NAME;\n                        }\n                        .b { color:green; }\n                    "
                },
                '/theme.st.css': {
                    namespace: 'theme',
                    content: ""
                }
            }
        });
        chai_1.expect(output).to.eql(".entry--root .entry--b { color:green; }");
    });
    it('should output according to import order (entry strongest - bottom of CSS)', function () {
        var output = generate_test_util_1.generateStylableOutput({
            entry: '/entry.st.css',
            usedFiles: [
                '/entry.st.css',
                '/comp.st.css'
            ],
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        .a { color:red; }\n                    "
                },
                '/comp.st.css': {
                    namespace: 'comp',
                    content: "\n                        .b { color:green; }\n                    "
                }
            }
        });
        chai_1.expect(output).to.eql([
            ".comp--root .comp--b { color:green; }",
            ".entry--root .entry--a { color:red; }"
        ].join('\n'));
    });
    it('should ignore js imports', function () {
        var output = generate_test_util_1.generateStylableOutput({
            entry: '/entry.st.css',
            usedFiles: [
                '/entry.st.css'
            ],
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        :import {\n                            -st-from: './script';\n                            -st-default: scriptExport;\n                        }\n                        .b { color:green; }\n                    "
                },
                '/script.js': {
                    content: ""
                }
            }
        });
        chai_1.expect(output).to.eql(".entry--root .entry--b { color:green; }");
    });
    it('should not output unused file', function () {
        var output = generate_test_util_1.generateStylableOutput({
            entry: '/entry.st.css',
            usedFiles: [
                '/entry.st.css'
            ],
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        .a { color:gold; }\n                    "
                },
                '/unused-comp.st.css': {
                    namespace: 'unusedComp',
                    content: "\n                        .c { color:red; }\n                    "
                }
            }
        });
        chai_1.expect(output).to.eql([
            ".entry--root .entry--a { color:gold; }"
        ].join('\n'));
    });
    it('should output selectors which contain used files roots', function () {
        var output = generate_test_util_1.generateStylableOutput({
            entry: '/entry.st.css',
            usedFiles: [
                '/entry.st.css',
                '/used-comp.st.css'
            ],
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        :import {\n                            -st-from: './used-comp.st.css';\n                            -st-default: UsedComp;\n                        }\n                        UsedComp { color: red; }\n                        .a {\n                            -st-extends: UsedComp;\n                            color: green;\n                        }\n                        .b.a { color: blue; }\n                        .b UsedComp { color: black; }\n                    "
                },
                '/used-comp.st.css': {
                    namespace: 'usedComp',
                    content: "\n                        .root { color: red; }\n                    "
                }
            }
        });
        chai_1.expect(output).to.eql([
            ".usedComp--root { color: red; }",
            ".entry--root .usedComp--root { color: red; }",
            ".entry--root .entry--a.usedComp--root {\n    -st-extends: UsedComp;\n    color: green;\n}",
            ".entry--root .entry--b.entry--a.usedComp--root { color: blue; }",
            ".entry--root .entry--b .usedComp--root { color: black; }"
        ].join('\n'));
    });
    it('should not output selectors which contain unused files roots', function () {
        var output = generate_test_util_1.generateStylableOutput({
            entry: '/entry.st.css',
            usedFiles: [
                '/entry.st.css'
            ],
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        :import {\n                            -st-from: './unused-comp.st.css';\n                            -st-default: UnusedComp;\n                        }\n                        UnusedComp { color: red; }\n                        .a {\n                            -st-extends: UnusedComp;\n                            color: green;\n                        }\n                        .b.a { color: blue; }\n                        .b UnusedComp { color: black; }\n\n                        .c { color:gold; }\n                    "
                },
                '/unused-comp.st.css': {
                    namespace: 'unusedComp',
                    content: "\n                        .root { color:red; }\n                    "
                }
            }
        });
        chai_1.expect(output).to.eql([
            ".entry--root .entry--c { color:gold; }"
        ].join('\n'));
    });
    it('should handle circular dependencies', function () {
        var output = null;
        chai_1.expect(function () {
            output = generate_test_util_1.generateStylableOutput({
                entry: '/entry-a.st.css',
                usedFiles: [
                    '/entry-a.st.css',
                    '/entry-b.st.css'
                ],
                files: {
                    '/entry-a.st.css': {
                        namespace: 'entryA',
                        content: "\n                            :import {\n                                -st-from: \"./entry-b.st.css\";\n                                -st-default: EntryB;\n                            }\n                            EntryB { color: red; }\n                        "
                    },
                    '/entry-b.st.css': {
                        namespace: 'entryB',
                        content: "\n                            :import {\n                                -st-from: \"./entry-a.st.css\";\n                                -st-default: EntryA;\n                            }\n                            EntryA { color: green; }\n                        "
                    }
                }
            });
        }).not.to.throw();
        chai_1.expect(output).to.eql([
            ".entryB--root .entryA--root { color: green; }",
            ".entryA--root .entryB--root { color: red; }"
        ].join('\n'));
    });
    describe('specific used files', function () {
        it('should be output from larger collection', function () {
            var bundler = generate_test_util_1.createTestBundler({
                entry: '',
                usedFiles: [],
                files: {
                    '/entry-a.st.css': {
                        namespace: 'entryA',
                        content: "\n                        .a { color:red; }\n                        "
                    },
                    '/entry-b.st.css': {
                        namespace: 'entryB',
                        content: "\n                        .b { color:green; }\n                        "
                    }
                }
            });
            bundler.addUsedFile('/entry-a.st.css');
            bundler.addUsedFile('/entry-b.st.css');
            var entryA_output = bundler.generateCSS(['/entry-a.st.css']);
            var entryB_output = bundler.generateCSS(['/entry-b.st.css']);
            chai_1.expect(entryA_output).to.eql([
                ".entryA--root .entryA--a { color:red; }"
            ].join('\n'));
            chai_1.expect(entryB_output).to.eql([
                ".entryB--root .entryB--b { color:green; }"
            ].join('\n'));
        });
        it('should be output with relevent theme', function () {
            var bundler = generate_test_util_1.createTestBundler({
                entry: '',
                usedFiles: [],
                files: {
                    '/entry-a.st.css': {
                        namespace: 'entryA',
                        content: "\n                        .a { color:red; }\n                        "
                    },
                    '/entry-b.st.css': {
                        namespace: 'entryB',
                        content: "\n                        .b { color:green; }\n                        "
                    }
                }
            });
            bundler.addUsedFile('/entry-a.st.css');
            bundler.addUsedFile('/entry-b.st.css');
            var entryA_output = bundler.generateCSS(['/entry-a.st.css']);
            var entryB_output = bundler.generateCSS(['/entry-b.st.css']);
            chai_1.expect(entryA_output).to.eql([
                ".entryA--root .entryA--a { color:red; }"
            ].join('\n'));
            chai_1.expect(entryB_output).to.eql([
                ".entryB--root .entryB--b { color:green; }"
            ].join('\n'));
        });
    });
});
//# sourceMappingURL=base.spec.js.map