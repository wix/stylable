"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai = require("chai");
var generate_test_util_1 = require("../utils/generate-test-util");
var expect = chai.expect;
describe('bundle: theme', function () {
    describe('insertion', function () {
        it('should be above used file that import it as theme', function () {
            var cssOutput = generate_test_util_1.generateStylableOutput({
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            :import {\n                                -st-theme: true;\n                                -st-from: \"./theme.st.css\";\n                            }\n                            .b { color:green; }\n                        "
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: "\n                            .a { color:red; }\n                        "
                    }
                }
            });
            expect(cssOutput).to.eql([
                '.theme--root .theme--a { color:red; }',
                '.entry--root .entry--b { color:green; }'
            ].join('\n'));
        });
        it('should be once for multiple theme imports', function () {
            var cssOutput = generate_test_util_1.generateStylableOutput({
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css',
                    '/entry2.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            :import {\n                                -st-theme: true;\n                                -st-from: \"./theme.st.css\";\n                            }\n                            .a1 { color:red; }\n                        "
                    },
                    '/entry2.st.css': {
                        namespace: 'entry2',
                        content: "\n                            :import {\n                                -st-theme: true;\n                                -st-from: \"./theme.st.css\";\n                            }\n                            .a2 { color:green; }\n                        "
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: "\n                            .x { color:blue; }\n                        "
                    }
                }
            });
            expect(cssOutput).to.eql([
                '.theme--root .theme--x { color:blue; }',
                '.entry2--root .entry2--a2 { color:green; }',
                '.entry--root .entry--a1 { color:red; }'
            ].join('\n'));
        });
        it('should be above file importing it with no theme flag', function () {
            var cssOutput = generate_test_util_1.generateStylableOutput({
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css',
                    '/comp.st.css',
                    '/comp2.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            :import {\n                                -st-theme: true;\n                                -st-from: \"./theme.st.css\";\n                            }\n                            .a { color:red; }\n                        "
                    },
                    '/comp.st.css': {
                        namespace: 'comp',
                        content: "\n                            .b { color:green; }\n                        "
                    },
                    '/comp2.st.css': {
                        namespace: 'comp2',
                        content: "\n                            :import {\n                                -st-from: \"./theme.st.css\";\n                            }\n                            .c { color:blue; }\n                        "
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: "\n                            .d { color:black; }\n                        "
                    }
                }
            });
            expect(cssOutput).to.eql([
                '.theme--root .theme--d { color:black; }',
                '.comp2--root .comp2--c { color:blue; }',
                '.comp--root .comp--b { color:green; }',
                '.entry--root .entry--a { color:red; }'
            ].join('\n'));
        });
    });
    describe('override vars', function () {
        it('should add override classes scoped to overriding file', function () {
            var cssOutput = generate_test_util_1.generateStylableOutput({
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            :import {\n                                -st-theme: true;\n                                -st-from: \"./theme.st.css\";\n                                color1: gold;\n                            }\n                            .a { color:red; }\n                        "
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: "\n                            :vars {\n                                color1:green;\n                            }\n                            .x { color:value(color1); }\n                            .y { background:value(color1); }\n                        "
                    }
                }
            });
            expect(cssOutput).to.eql([
                '.theme--root .theme--x { color:green; }',
                '.entry--root .theme--x { color:gold; }',
                '.theme--root .theme--y { background:green; }',
                '.entry--root .theme--y { background:gold; }',
                '.entry--root .entry--a { color:red; }'
            ].join('\n'));
        });
        it('should add only effected CSS', function () {
            var cssOutput = generate_test_util_1.generateStylableOutput({
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            :import {\n                                -st-theme: true;\n                                -st-from: \"./theme.st.css\";\n                                color1: gold;\n                            }\n                            .b { color:green; }\n                        "
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: "\n                            :vars {\n                                color1:red;\n                            }\n                            .a { color:value(color1); background:yellow; }\n                            .c { color:purple; }\n                        "
                    }
                }
            });
            expect(cssOutput).to.eql([
                ".theme--root .theme--a { color:red; background:yellow; }",
                ".entry--root .theme--a { color:gold; }",
                ".theme--root .theme--c { color:purple; }",
                ".entry--root .entry--b { color:green; }"
            ].join('\n'));
        });
        it('should position override CSS after original CSS', function () {
            var cssOutput = generate_test_util_1.generateStylableOutput({
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css',
                    '/comp.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            :import {\n                                -st-theme: true;\n                                -st-from: \"./theme.st.css\";\n                                color1: gold;\n                            }\n                            .b { color:green; }\n                        "
                    },
                    '/comp.st.css': {
                        namespace: 'comp',
                        content: "\n                            :import {\n                                -st-from: \"./theme.st.css\";\n                            }\n                            .x { color:blue; }\n                        "
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: "\n                            :vars {\n                                color1:red;\n                            }\n                            .a { color:value(color1); }\n                        "
                    }
                }
            });
            expect(cssOutput).to.eql([
                '.theme--root .theme--a { color:red; }',
                '.entry--root .theme--a { color:gold; }',
                '.comp--root .comp--x { color:blue; }',
                '.entry--root .entry--b { color:green; }'
            ].join('\n'));
        });
        it('should effect nested themes (override all the way to var source)', function () {
            var cssOutput = generate_test_util_1.generateStylableOutput({
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            :import {\n                                -st-theme: true;\n                                -st-from: \"./theme.st.css\";\n                                color1: gold;\n                            }\n                            .c { color:green; }\n                        "
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: "\n                            :import {\n                                -st-theme: true;\n                                -st-from: \"./base-theme.st.css\";\n                                -st-named: color1;\n                            }\n                            .b { color:value(color1); }\n                        "
                    },
                    '/base-theme.st.css': {
                        namespace: 'base-theme',
                        content: "\n                            :vars {\n                                color1:red;\n                            }\n                            .a { color:value(color1); }\n                        "
                    }
                }
            });
            expect(cssOutput).to.eql([
                '.base-theme--root .base-theme--a { color:red; }',
                '.entry--root .base-theme--a { color:gold; }',
                '.theme--root .theme--b { color:red; }',
                '.entry--root .theme--b { color:gold; }',
                '.entry--root .entry--c { color:green; }'
            ].join('\n'));
        });
        it('should override import as vars', function () {
            var cssOutput = generate_test_util_1.generateStylableOutput({
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            :import {\n                                -st-theme: true;\n                                -st-from: \"./theme.st.css\";\n                                colorX: gold;\n                            }\n                            .c { color:green; }\n                        "
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: "\n                            :import {\n                                -st-theme: true;\n                                -st-from: \"./base-theme.st.css\";\n                                -st-named: color1 as colorX;\n                            }\n                            .b { color:value(colorX); }\n                        "
                    },
                    '/base-theme.st.css': {
                        namespace: 'base-theme',
                        content: "\n                            :vars {\n                                color1:red;\n                            }\n                            .a { color:value(color1); }\n                        "
                    }
                }
            });
            expect(cssOutput).to.eql([
                '.base-theme--root .base-theme--a { color:red; }',
                '.entry--root .base-theme--a { color:gold; }',
                '.theme--root .theme--b { color:red; }',
                '.entry--root .theme--b { color:gold; }',
                '.entry--root .entry--c { color:green; }'
            ].join('\n'));
        });
        it('should override value(var)', function () {
            var cssOutput = generate_test_util_1.generateStylableOutput({
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            :import {\n                                -st-theme: true;\n                                -st-from: \"./theme.st.css\";\n                                color1: gold;\n                            }\n                        "
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: "\n                            :vars {\n                                color1:red;\n                                color2:value(color1)\n                            }\n                            .t { color:value(color1); border:value(color2); }\n                        "
                    }
                }
            });
            expect(cssOutput).to.eql([
                '.theme--root .theme--t { color:red; border:red; }',
                '.entry--root .theme--t { color:gold; border:gold; }'
            ].join('\n'));
        });
        it('should resolve none overridden vars', function () {
            /**
             * this is a side effect of resolving overrides, where any value might be overridden
             * just because there is an override. need to see that normal imported vars are resolved correctly.
             */
            var cssOutput = generate_test_util_1.generateStylableOutput({
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css',
                    '/comp.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            :import {\n                                -st-theme: true;\n                                -st-from: \"./theme.st.css\";\n                                color2: silver;\n                            }\n                        "
                    },
                    '/comp.st.css': {
                        namespace: 'comp',
                        content: "\n                            :import {\n                                -st-from: \"./theme.st.css\";\n                                -st-named: color1, color2;\n                            }\n                            .c { color:value(color1); }\n                        "
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: "\n                            :vars {\n                                color1:red;\n                                color2:blue;\n                            }\n                        "
                    }
                }
            });
            expect(cssOutput).to.eql([
                '.comp--root .comp--c { color:red; }'
            ].join('\n'));
        });
        it('should add override CSS to none theme stylesheets using the overridden vars', function () {
            var cssOutput = generate_test_util_1.generateStylableOutput({
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css',
                    '/comp.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            :import {\n                                -st-theme: true;\n                                -st-from: \"./theme.st.css\";\n                                color1: gold;\n                            }\n                            .a { color:green; }\n                        "
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: "\n                            :vars {\n                                color1:red;\n                            }\n                            .c { color:value(color1); }\n                        "
                    },
                    '/comp.st.css': {
                        namespace: 'comp',
                        content: "\n                            :import {\n                                -st-from: \"./theme.st.css\";\n                                -st-named: color1;\n                            }\n                            .root { color:value(color1); }\n                            .d { color:value(color1); }\n                        "
                    }
                }
            });
            expect(cssOutput).to.eql([
                '.theme--root .theme--c { color:red; }',
                '.entry--root .theme--c { color:gold; }',
                '.comp--root { color:red; }',
                '.entry--root .comp--root { color:gold; }',
                '.comp--root .comp--d { color:red; }',
                '.entry--root .comp--root .comp--d { color:gold; }',
                '.entry--root .entry--a { color:green; }'
            ].join('\n'));
        });
        it('should add override CSS overridden in a nested theme', function () {
            var cssOutput = generate_test_util_1.generateStylableOutput({
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css',
                    '/comp.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            :import {\n                                -st-theme: true;\n                                -st-from: \"./base-theme.st.css\";\n                                color1: gold;\n                            }\n                            .a { color:green; }\n                        "
                    },
                    '/base-theme.st.css': {
                        namespace: 'baseTheme',
                        content: "\n                            :vars {\n                                color1:red;\n                            }\n                            .c { color:value(color1); }\n                        "
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: "\n                            :import {\n                                -st-theme: true;\n                                -st-from: \"./base-theme.st.css\";\n                                -st-named: color1;\n                            }\n                        "
                    },
                    '/comp.st.css': {
                        namespace: 'comp',
                        content: "\n                            :import {\n                                -st-from: \"./theme.st.css\";\n                                -st-named: color1;\n                            }\n                            .d { color:value(color1); }\n                        "
                    }
                }
            });
            expect(cssOutput).to.eql([
                '.baseTheme--root .baseTheme--c { color:red; }',
                '.entry--root .baseTheme--c { color:gold; }',
                '.comp--root .comp--d { color:red; }',
                '.entry--root .comp--root .comp--d { color:gold; }',
                '.entry--root .entry--a { color:green; }'
            ].join('\n'));
        });
        it('should add override to CSS effected from the override itself', function () {
            var cssOutput = generate_test_util_1.generateStylableOutput({
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            :import {\n                                -st-theme: true;\n                                -st-from: \"./theme.st.css\";\n                                -st-named: color1;\n                                color1: gold;\n                            }\n                            .a { color:value(color1); }\n                        "
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: "\n                            :vars {\n                                color1:red;\n                            }\n                            .b { color:value(color1); }\n                        "
                    }
                }
            });
            expect(cssOutput).to.eql([
                '.theme--root .theme--b { color:red; }',
                '.entry--root .theme--b { color:gold; }',
                '.entry--root .entry--a { color:red; }',
                '.entry--root.entry--root .entry--a { color:gold; }' /* <-- */
            ].join('\n'));
        });
        it('should add override multiple theme using sheets', function () {
            var cssOutput = generate_test_util_1.generateStylableOutput({
                entry: '/entry.st.css',
                usedFiles: [
                    '/a.st.css',
                    '/b.st.css'
                ],
                files: {
                    '/a.st.css': {
                        namespace: 'a',
                        content: "\n                            :import {\n                                -st-theme: true;\n                                -st-from: \"./theme.st.css\";\n                                -st-named: color1;\n                                color1: gold;\n                            }\n                            .a { color:value(color1); }\n                        "
                    },
                    '/b.st.css': {
                        namespace: 'b',
                        content: "\n                            :import {\n                                -st-theme: true;\n                                -st-from: \"./theme.st.css\";\n                                -st-named: color1;\n                                color1: silver;\n                            }\n                            .b { color:value(color1); }\n                        "
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: "\n                            :vars {\n                                color1:red;\n                            }\n                        "
                    }
                }
            });
            expect(cssOutput).to.eql([
                '.b--root .b--b { color:red; }',
                '.a--root .b--root .b--b { color:gold; }',
                '.b--root.b--root .b--b { color:silver; }',
                '.a--root .a--a { color:red; }',
                '.a--root.a--root .a--a { color:gold; }',
                '.b--root .a--root .a--a { color:silver; }'
                /* ToDo: doesn't have any effect in any of our current use cases,
                but containers with theme might use something like this */
            ].join('\n'));
        });
        it('should add override entry to global classes (naive)', function () {
            var cssOutput = generate_test_util_1.generateStylableOutput({
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            :import {\n                                -st-theme: true;\n                                -st-from: \"./theme.st.css\";\n                                color1: gold;\n                            }\n                        "
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: "\n                            :vars {\n                                color1:green;\n                            }\n                            :global(.x) { color:value(color1); }\n                        "
                    }
                }
            });
            expect(cssOutput).to.eql([
                '.x { color:green; }',
                '.entry--root .x { color:gold; }'
            ].join('\n'));
        });
        it('should output entry point override before sub entry override', function () {
            var cssOutput = generate_test_util_1.generateStylableOutput({
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css',
                    '/sub-entry.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            :import {\n                                -st-theme: true;\n                                -st-from: \"./theme.st.css\";\n                                color1: gold;\n                            }\n                            .a { color:green; }\n                        "
                    },
                    '/sub-entry.st.css': {
                        namespace: 'subEntry',
                        content: "\n                            :import {\n                                -st-theme: true;\n                                -st-from: \"./theme.st.css\";\n                                color1: silver;\n                            }\n                            .b { color:green; }\n                        "
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: "\n                            :vars {\n                                color1:red;\n                            }\n                            .x { color:value(color1); }\n                        "
                    }
                }
            });
            expect(cssOutput).to.eql([
                '.theme--root .theme--x { color:red; }',
                '.entry--root .theme--x { color:gold; }',
                '.subEntry--root .theme--x { color:silver; }',
                '.subEntry--root .subEntry--b { color:green; }',
                '.entry--root .entry--a { color:green; }'
            ].join('\n'));
        });
    });
    describe('cleanup', function () {
        it('should not remove ruleset imported from theme', function () {
            var cssOutput = generate_test_util_1.generateStylableOutput({
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            :import {\n                                -st-theme: true;\n                                -st-from: \"./theme.st.css\";\n                                -st-named: myClass;\n                            }\n                            .myClass { color:red; }\n                        "
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: "\n                           .myClass {}\n                        "
                    }
                }
            });
            expect(cssOutput).to.eql([
                '.theme--root .theme--myClass {}',
                '.entry--root .theme--myClass { color:red; }'
            ].join('\n'));
        });
    });
});
//# sourceMappingURL=theme.spec.js.map