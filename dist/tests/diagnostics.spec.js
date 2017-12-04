"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var path_1 = require("path");
var src_1 = require("../src");
var native_pseudos_1 = require("../src/native-pseudos");
var parser_1 = require("../src/parser");
var stylable_processor_1 = require("../src/stylable-processor");
var stylable_utils_1 = require("../src/stylable-utils");
var generate_test_util_1 = require("./utils/generate-test-util");
var deindent = require('deindent');
var customButton = "\n    .root{\n        -st-states:shmover;\n    }\n    .my-part{\n\n    }\n    .my-variant{\n        -st-variant:true;\n        color:red;\n    }\n\n";
function findTestLocations(css) {
    var line = 1;
    var column = 1;
    var inWord = false;
    var start;
    var end;
    var word = null;
    for (var i = 0; i < css.length; i++) {
        var ch = css.charAt(i);
        if (ch === '\n') {
            line += 1;
            column = 1;
        }
        else if (ch === '|') {
            if (!start) {
                start = { line: line, column: column };
            }
            else {
                end = { line: line, column: column };
            }
        }
        else if (ch === '$') {
            inWord = !inWord;
            if (inWord) {
                word = '';
            }
        }
        else if (inWord) {
            word += ch;
        }
        else {
            column++;
        }
    }
    return { start: start, end: end, word: word, css: css.replace(/[|$]/gm, '') };
}
describe('findTestLocations', function () {
    it('find single location 1', function () {
        var l = findTestLocations('\n  |a|');
        chai_1.expect(l.start, 'start').to.eql({ line: 2, column: 3 });
        chai_1.expect(l.end, 'end').to.eql({ line: 2, column: 4 });
    });
    it('find single location 2', function () {
        var l = findTestLocations('\n  |a\n  |');
        chai_1.expect(l.start, 'start').to.eql({ line: 2, column: 3 });
        chai_1.expect(l.end, 'end').to.eql({ line: 3, column: 3 });
    });
    it('find single location with word', function () {
        var l = findTestLocations('\n  |$a$\n  |');
        chai_1.expect(l.start, 'start').to.eql({ line: 2, column: 3 });
        chai_1.expect(l.end, 'end').to.eql({ line: 3, column: 3 });
        chai_1.expect(l.word, 'end').to.eql('a');
    });
    it('striped css', function () {
        var css = '\n  |$a$\n  |';
        var l = findTestLocations(css);
        chai_1.expect(l.css, 'start').to.eql(css.replace(/[|$]/gm, ''));
    });
});
function expectWarnings(css, warnings) {
    var source = findTestLocations(css);
    var root = parser_1.safeParse(source.css);
    var res = stylable_processor_1.process(root);
    res.diagnostics.reports.forEach(function (report, i) {
        chai_1.expect(report.message).to.equal(warnings[i].message);
        chai_1.expect(report.node.source.start, 'start').to.eql(source.start);
        if (source.word !== null) {
            chai_1.expect(report.options.word).to.eql(source.word);
        }
    });
    chai_1.expect(res.diagnostics.reports.length, 'diagnostics reports match').to.equal(warnings.length);
}
function expectWarningsFromTransform(config, warnings) {
    config.trimWS = false;
    var locations = {};
    for (var path in config.files) {
        var source = findTestLocations(deindent(config.files[path].content).trim());
        config.files[path].content = source.css;
        locations[path] = source;
    }
    var diagnostics = new src_1.Diagnostics();
    generate_test_util_1.generateFromMock(config, diagnostics);
    if (warnings.length === 0 && diagnostics.reports.length !== 0) {
        chai_1.expect(warnings.length, 'diagnostics reports match').to.equal(diagnostics.reports.length);
    }
    diagnostics.reports.forEach(function (report, i) {
        var path = warnings[i].file;
        chai_1.expect(report.message).to.equal(warnings[i].message);
        chai_1.expect(report.node.source.start).to.eql(locations[path].start);
        if (locations[path].word !== null) {
            chai_1.expect(report.options.word).to.eql(locations[path].word);
        }
    });
    chai_1.expect(warnings.length, 'diagnostics reports match').to.equal(diagnostics.reports.length);
}
describe('diagnostics: warnings and errors', function () {
    // TODO2: next phase
    describe('syntax', function () {
        xdescribe('selectors', function () {
            it('should return warning for unidentified tag selector', function () {
                expectWarnings("\n                    |Something| {\n\n                    }\n                ", [{ message: '"Something" component is not imported', file: 'main.css' }]);
            });
            it('should return warning for unterminated "."', function () {
                expectWarnings("\n                    .root{\n\n                    }\n                    .|\n                ", [{ message: 'identifier expected', file: 'main.css' }]);
            });
            it('should return warning for unterminated ":"', function () {
                expectWarnings("\n                    .root{\n\n                    }\n                    :|\n                ", [{ message: 'identifier expected', file: 'main.css' }]);
            });
            it('should return warning for className without rule area', function () {
                expectWarnings("\n                    .root{\n\n                    }\n                    .gaga|\n                ", [{ message: '{ expected', file: 'main.css' }]);
            });
        });
        xdescribe('ruleset', function () {
            it('should return warning for unterminated ruleset', function () {
                expectWarnings("\n                    .root{\n\n                    }\n                    .gaga{\n                        color:red|\n                ", [{ message: '; expected', file: 'main.css' }]);
            });
        });
        xdescribe('rules', function () {
            it('should return warning for unterminated rule', function () {
                expectWarnings("\n                    .root{\n\n                    }\n                    .gaga{\n                        color|\n                    }\n                ", [{ message: ': expected', file: 'main.css' }]);
                expectWarnings("\n                    .root{\n\n                    }\n                    .gaga{\n                        color:|\n                    }\n                ", [{ message: 'property value expected', file: 'main.css' }]);
                // todo: add cases for any unterminated selectors (direct descendant, etc...)
            });
            it('should return warning for unknown rule', function () {
                expectWarnings("\n                    .root{\n                        |hello|:yossi;\n                    }\n                ", [{ message: 'unknown rule "hello"', file: 'main.css' }]);
            });
            it('should warn when using illegal characters', function () {
                expectWarnings("\n                    <|{\n\n                    }\n                ", [{ message: 'illegal character <', file: 'main.css' }]);
            });
            it('should return warning for unknown directive', function () {
                expectWarnings("\n                    .gaga{\n                        |-st-something|:true;\n                    }\n                ", [{ message: 'unknown directive "-st-something"', file: 'main.css' }]);
            });
        });
        xdescribe('states', function () {
            it('should return warning for state without selector', function () {
                expectWarnings("\n                    |:hover|{\n\n                    }\n                ", [{ message: 'global states are not supported, use .root:hover instead', file: 'main.css' }]);
            });
            it('should return warning for unknown state', function () {
                expectWarnings("\n                    .root:|shmover|{\n\n                    }\n                ", [{ message: 'unknown state "shmover"', file: 'main.css' }]);
            });
        });
        describe('pseudo selectors', function () {
            xit('should return warning for native pseudo elements without selector', function () {
                expectWarnings("\n                    |::before|{\n\n                    }\n                ", [{
                        message: 'global pseudo elements are not allowed, you can use ".root::before" instead',
                        file: 'main.css'
                    }]);
            });
            describe('elements', function () {
                it('should return a warning for an unknown pseudo element', function () {
                    var config = {
                        entry: '/main.css',
                        files: {
                            '/main.css': {
                                content: "\n                                |.root::$myBtn$|{\n\n                                }"
                            }
                        }
                    };
                    expectWarningsFromTransform(config, [{ message: 'unknown pseudo element "myBtn"', file: '/main.css' }]);
                });
                native_pseudos_1.nativePseudoElements.forEach(function (nativeElement) {
                    it("should not return a warning for native " + nativeElement + " pseudo element", function () {
                        var selector = "|.root::$" + nativeElement + "$|{";
                        var config = {
                            entry: '/main.css',
                            files: {
                                '/main.css': {
                                    content: "\n                                    " + selector + "\n                                    }"
                                }
                            }
                        };
                        expectWarningsFromTransform(config, []);
                    });
                });
            });
            describe('classes', function () {
                it('should return a warning for an unknown pseudo class', function () {
                    var config = {
                        entry: '/main.css',
                        files: {
                            '/main.css': {
                                content: "\n                                |.root:$superSelected$|{\n\n                                }"
                            }
                        }
                    };
                    expectWarningsFromTransform(config, [{ message: 'unknown pseudo class "superSelected"', file: '/main.css' }]);
                });
                native_pseudos_1.nativePseudoClasses.forEach(function (nativeClass) {
                    it("should not return a warning for native " + nativeClass + " pseudo class", function () {
                        var selector = "|.root:$" + nativeClass + "$|{";
                        var config = {
                            entry: '/main.css',
                            files: {
                                '/main.css': {
                                    content: "\n                                    " + selector + "\n\n                                    }"
                                }
                            }
                        };
                        expectWarningsFromTransform(config, []);
                    });
                });
                it("should not report a warning when the custom state is declared in an imported stylesheet", function () {
                    var config = {
                        entry: '/main.st.css',
                        files: {
                            '/main.st.css': {
                                content: "\n                                    :import {\n                                        -st-from: \"./comp.st.css\";\n                                        -st-default: Comp;\n                                    }\n                                    .root {\n                                       -st-extends: Comp;\n                                    }\n                                    .root:loading {}\n                                "
                            },
                            '/comp.st.css': {
                                content: "\n                                    .root {\n                                        -st-states: loading;\n                                    }\n                                "
                            }
                        }
                    };
                    expectWarningsFromTransform(config, []);
                });
            });
        });
    });
    describe('structure', function () {
        describe('root', function () {
            it('should return warning for ".root" after selector', function () {
                expectWarnings("\n                    |.gaga .root|{}\n                ", [{ message: '.root class cannot be used after spacing', file: 'main.css' }]);
            });
        });
        describe('-st-states', function () {
            it('should return warning when defining states in complex selector', function () {
                expectWarnings("\n                    .gaga:hover{\n                        |-st-states|:shmover;\n                    }\n                ", [{ message: 'cannot define pseudo states inside complex selectors', file: 'main.css' }]);
            });
            it('should warn when defining states on element selector', function () {
                var config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: "\n                            MyElement{\n                                |-st-states|:shmover;\n                            }"
                        }
                    }
                };
                expectWarningsFromTransform(config, [{ message: 'cannot define pseudo states inside element selectors', file: '/main.css' }]);
            });
        });
        describe('-st-mixin', function () {
            it('should return warning for unknown mixin', function () {
                expectWarnings("\n                    .gaga{\n                        |-st-mixin: $myMixin$|;\n                    }\n                ", [{ message: 'unknown mixin: "myMixin"', file: 'main.css' }]);
            });
            it('should add error when can not append css mixins', function () {
                var config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: "\n                            :import {\n                                -st-from: \"./imported.st.css\";\n                                |-st-named: $my-mixin$;|\n                            }\n                            .container {\n                                -st-mixin: my-mixin;\n                            }\n                            "
                        },
                        '/imported.st.css': {
                            content: ""
                        }
                    }
                };
                expectWarningsFromTransform(config, [{ message: 'import mixin does not exist', file: '/main.css' }]);
            });
            it('should add diagnostics when there is a bug in mixin', function () {
                var config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: "\n                            :import {\n                                -st-from: \"./imported.js\";\n                                -st-default: myMixin;\n                            }\n                            |.container {\n                                -st-mixin: $myMixin$;\n                            }|\n                            "
                        },
                        '/imported.js': {
                            content: "\n                                module.exports = function(){\n                                    throw 'bug in mixin'\n                                }\n                            "
                        }
                    }
                };
                expectWarningsFromTransform(config, [{ message: 'could not apply mixin: bug in mixin', file: '/main.css' }]);
            });
            it('js mixin must be a function', function () {
                var config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: "\n                            :import {\n                                -st-from: \"./imported.js\";\n                                -st-named: myMixin;\n                            }\n                            |.container {\n                                -st-mixin: $myMixin$;\n                            }|\n                            "
                        },
                        '/imported.js': {
                            content: "\n\n                            "
                        }
                    }
                };
                expectWarningsFromTransform(config, [{ message: 'js mixin must be a function', file: '/main.css' }]);
            });
            it('should add diagnostics when declartion is invalid', function () {
                var config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: "\n                            :import {\n                                -st-from: \"./imported.js\";\n                                -st-default: myMixin;\n                            }\n                            .container {\n                                |-st-mixin: $myMixin$|;\n                            }\n                            "
                        },
                        '/imported.js': {
                            content: "\n                                module.exports = function(){\n                                    return {\n                                        color: true\n                                    }\n                                }\n                            "
                        }
                    }
                };
                expectWarningsFromTransform(config, [{ message: 'not a valid mixin declaration myMixin', file: '/main.css' }]);
            });
            it('should add diagnostics when declartion is invalid (rule)', function () {
                var config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: "\n                            :import {\n                                -st-from: \"./imported.js\";\n                                -st-default: myMixin;\n                            }\n                            .container {\n                                |-st-mixin: $myMixin$|;\n                            }\n                            "
                        },
                        '/imported.js': {
                            content: "\n                                module.exports = function(){\n                                    return {\n                                        '.x':{\n                                            color:true\n                                        }\n                                    }\n                                }\n                            "
                        }
                    }
                };
                expectWarningsFromTransform(config, [{ message: "not a valid mixin declaration 'color', and was removed", file: '/main.css' }]);
            });
            it('should not add warning when mixin value is a string', function () {
                var config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: "\n                            :import {\n                                -st-from: \"./imported.js\";\n                                -st-default: myMixin;\n                            }\n                            .container {\n                                |-st-mixin: $\"myMixin\"$|;\n                            }\n                            "
                        },
                        '/imported.js': {
                            content: ""
                        }
                    }
                };
                expectWarningsFromTransform(config, [{ message: 'value can not be a string (remove quotes?)', file: '/main.css' }]);
            });
        });
        describe(':vars', function () {
            it('should return warning for unknown var', function () {
                expectWarnings("\n                    .gaga{\n                        |color:value($myColor$)|;\n                    }\n                ", [{ message: 'unknown var "myColor"', file: 'main.css' }]);
            });
            it('should return warning for unknown var on transform', function () {
                expectWarningsFromTransform({
                    entry: '/style.st.css',
                    files: {
                        '/style.st.css': {
                            content: "\n                            .gaga{\n                                |color:value($myColor$)|;\n                            }\n                        "
                        }
                    }
                }, [{ message: 'unknown var "myColor"', file: '/style.st.css' }]);
            });
            it('should return warning for unresolvable var', function () {
                expectWarnings("\n                    :vars{\n                        |myvar: $value(myvar)$|;\n                    }\n                ", [{ message: 'cannot resolve variable value for "myvar"', file: 'main.css' }]);
            });
            it('should return warning when defined in a complex selector', function () {
                expectWarnings("\n                    |.gaga:vars|{\n                        myColor:red;\n                    }\n\n                ", [{ message: 'cannot define ":vars" inside a complex selector', file: 'main.css' }]);
            });
        });
        xdescribe('-st-variant', function () {
            it('should return warning when defining variant in complex selector', function () {
                expectWarnings("\n                    .gaga:hover{\n                        |-st-variant|:true;\n                    }\n                ", [{ message: 'cannot define "-st-variant" inside complex selector', file: 'main.css' }]);
            });
            it('should return warning when -st-variant value is not true or false', function () {
                expectWarnings("\n                    .gaga {\n                        -st-variant:|red|;\n                    }\n                ", [{ message: '-st-variant can only be true or false, the value "red" is illegal', file: 'main.css' }]);
            });
        });
        describe(':import', function () {
            it('should return warning when defined in a complex selector', function () {
                expectWarnings("\n                    |.gaga:import|{\n                        -st-from:\"./file\";\n                        -st-default:Theme;\n                    }\n                ", [{ message: 'cannot define ":import" inside a complex selector', file: 'main.css' }]);
            });
            it('should return warning for non import rules inside imports', function () {
                var config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: "\n                            :import{\n                                -st-from:\"./file.css\";\n                                -st-default:Comp;\n                                |$color$:red;|\n                            }\n                          "
                        },
                        'file.css': {
                            content: customButton
                        }
                    }
                };
                expectWarningsFromTransform(config, [{ message: "'color' css attribute cannot be used inside :import block", file: '/main.css' }]);
            });
            it('should return warning for import with missing "from"', function () {
                expectWarnings("\n\n                    |:import{\n                        -st-default:Comp;\n                    }\n                ", [{ message: "'-st-from' is missing in :import block", file: 'main.css' }]);
            });
        });
        describe('-st-extends', function () {
            it('should return warning when defined under complex selector', function () {
                expectWarnings("\n                    :import{\n                        -st-from:\"./file\";\n                        -st-default:Comp;\n                    }\n                    .root:hover{\n                        |-st-extends|:Comp;\n                    }\n                ", [{ message: 'cannot define "-st-extends" inside a complex selector', file: 'main.css' }]);
            });
            it('Only import of type class can be used to extend', function () {
                var config = {
                    entry: '/main.st.css',
                    files: {
                        '/main.st.css': {
                            content: "\n                            :import {\n                                -st-from: './file.st.css';\n                                -st-named: special;\n                            }\n                            .myclass {\n                                |-st-extends: $special$|;\n                            }\n                            "
                        },
                        '/file.st.css': {
                            content: "\n                                :vars {\n                                    special: red\n                                }\n                            "
                        }
                    }
                };
                expectWarningsFromTransform(config, [{ message: 'import is not extendable', file: '/main.st.css' }]);
            });
            it('should warn if extends by js import', function () {
                var config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: "\n                            :import {\n                                -st-from: './file.js';\n                                -st-default: special;\n                            }\n                            .myclass {\n                                |-st-extends: $special$|\n                            }\n                            "
                        },
                        '/file.js': {
                            content: ""
                        }
                    }
                };
                expectWarningsFromTransform(config, [{ message: 'JS import is not extendable', file: '/main.css' }]);
            });
            it('should warn if named extends does not exist', function () {
                var config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: "\n                            :import {\n                                -st-from: './file.st.css';\n                                |-st-named: $special$;|\n                            }\n                            .myclass {\n                                -st-extends: special;\n                            }\n                            "
                        },
                        '/file.st.css': {
                            content: "\n                                .notSpecial {\n                                    color: red;\n                                }\n                            "
                        }
                    }
                };
                expectWarningsFromTransform(config, [{ message: "Could not resolve 'special'", file: '/main.css' }]);
            });
            it('should warn if file not found', function () {
                var config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: "\n                            :import {\n                                |-st-from: $'./file.css'$|;\n                                -st-default: special;\n                            }\n                            .myclass {\n                                -st-extends: special\n                            }\n                            "
                        }
                    }
                };
                expectWarningsFromTransform(config, [{ message: "Imported file '" + path_1.resolve('/file.css') + "' not found", file: '/main.css' }]);
            });
        });
        describe('override -st-* warnings', function () {
            it('should warn on typed class extend override', function () {
                expectWarnings("\n                    :import {\n                        -st-from : './file.css';\n                        -st-default: Comp;\n                    }\n                    .root {\n                        -st-extends: Comp;\n                    }\n                    .root {\n                        |-st-extends: Comp;|\n                    }\n                ", [{ message: 'override "-st-extends" on typed rule "root"', file: 'main.css' }]);
            });
            it('should warn on typed class states override', function () {
                expectWarnings("\n\n                    .root {\n                        -st-states: mystate;\n                    }\n                    .root {\n                        |-st-states: mystate2;|\n                    }\n                ", [{ message: 'override "-st-states" on typed rule "root"', file: 'main.css' }]);
            });
        });
    });
    describe('redeclare symbols', function () {
        it('should warn override mixin on same rule', function () {
            var config = {
                entry: '/main.css',
                files: {
                    '/main.css': {
                        content: "\n                        .a {}\n                        .b {\n                            -st-mixin: a;\n                            |-st-mixin: a|;\n                        }\n                      "
                    },
                    'file.css': {
                        content: customButton
                    }
                }
            };
            expectWarningsFromTransform(config, [{ message: 'override mixin on same rule', file: '/main.css' }]);
        });
        describe('from import', function () {
            it('should warn for unknown import', function () {
                var config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: "\n                            :import{\n                                -st-from:\"./import.css\";\n                                |-st-named: shlomo, $momo$;|\n                            }\n                            .myClass {\n                                -st-extends: shlomo;\n                            }\n                            .myClass1 {\n                                -st-extends: momo;\n                            }\n                          "
                        },
                        '/import.css': {
                            content: "\n                                .shlomo {\n                                    color: red\n                                }\n                            "
                        }
                    }
                };
                expectWarningsFromTransform(config, [{ message: "Could not resolve 'momo'", file: '/main.css' }]);
            });
            it('should warn when import redeclare same symbol (in same block)', function () {
                expectWarnings("\n                    |:import {\n                        -st-from: './file.css';\n                        -st-default: name;\n                        -st-named: $name$;\n                    }\n                ", [{ message: 'redeclare symbol "name"', file: 'main.css' }]);
            });
            it('should warn when import redeclare same symbol (in different block)', function () {
                expectWarnings("\n                    :import {\n                        -st-from: './file.css';\n                        -st-default: name;\n                    }\n                    |:import {\n                        -st-from: './file.css';\n                        -st-default: $name$;\n                    }\n                ", [{ message: 'redeclare symbol "name"', file: 'main.css' }]);
            });
            it('should warn when import redeclare same symbol (in different block types)', function () {
                expectWarnings("\n                    :import {\n                        -st-from: './file.css';\n                        -st-default: name;\n                    }\n                    :vars {\n                        |$name$: red;\n                    }\n                ", [{ message: 'redeclare symbol "name"', file: 'main.css' }]);
            });
        });
    });
    describe('complex examples', function () {
        describe(':import', function () {
            it('should return warning for unknown var import', function () {
                var config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: "\n                            :import{\n                                -st-from:\"./file.css\";\n                                -st-default:Comp;\n                                |-st-named:$variant$|;\n                            }\n                            .root {\n                                color:value(variant)\n                            }"
                        },
                        '/file.css': {
                            content: customButton
                        }
                    }
                };
                expectWarningsFromTransform(config, [{ message: "cannot find export 'variant' in './file.css'", file: '/main.css' }]);
            });
        });
        describe('cross variance', function () {
            xit('variant cannot be used as var', function () {
                expectWarnings("\n                    :import{\n                        -st-from:\"./file\";\n                        -st-default:Comp;\n                        -st-named:my-variant;\n                    }\n                    .root{\n                        color:|value(my-variant)|;\n                    }\n                ", [{ message: '"my-variant" is a variant and cannot be used as a var', file: 'main.css' }]);
            });
            it('mixin cannot be used as var', function () {
                var config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: "\n                            :import{\n                                -st-from:\"./mixins\";\n                                -st-named:my-mixin;\n                            }\n                            .root{\n                                |color:value($my-mixin$)|;\n                            }\n                          "
                        },
                        '/mixins.js': {
                            content: ""
                        }
                    }
                };
                expectWarningsFromTransform(config, [{ message: '"my-mixin" is a mixin and cannot be used as a var', file: '/main.css' }]);
            });
            it('stylesheet cannot be used as var', function () {
                var config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: "\n                            :import{\n                                -st-from:\"./file.css\";\n                                -st-default:Comp;\n                            }\n                            .root{\n                                |color:value($Comp$)|;\n                            }\n                          "
                        },
                        '/file.css': {
                            content: customButton
                        }
                    }
                };
                expectWarningsFromTransform(config, [{ message: '"Comp" is a stylesheet and cannot be used as a var', file: '/main.css' }]);
            });
            it('stylesheet cannot be used as mixin', function () {
                var config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: "\n                            :import{\n                                -st-from:\"./file.css\";\n                                |-st-default:$Comp$|;\n                            }\n                            .root{\n                                -st-mixin:Comp;\n                            }\n                          "
                        },
                        '/file.css': {
                            content: customButton
                        }
                    }
                };
                expectWarningsFromTransform(config, [{ message: "'Comp' is a stylesheet and cannot be used as a mixin", file: '/main.css' }]);
            });
            xit('component variant cannot be used for native node', function () {
                expectWarnings("\n                    :import{\n                        -st-from:\"./file\";\n                        -st-default:Comp;\n                        -st-named:my-variant;\n                    }\n\n                    .gaga{\n                        -st-mixin:|my-variant|;\n                    }\n                ", [{
                        // tslint:disable-next-line:max-line-length
                        message: '"my-variant" cannot be applied to ".gaga", ".gaga" refers to a native node and "my-variant" can only be spplied to "$namespace of comp"',
                        file: 'main.css'
                    }]);
            });
            xit('variants can only be used for a specific component', function () {
                expectWarnings("\n                    :import{\n                        -st-from:\"./file\";\n                        -st-default:Comp;\n                        -st-named:my-variant;\n                    }\n                    :import{\n                        -st-from:\"./file2\";\n                        -st-default:Comp2;\n                        -st-named:my-variant2;\n                    }\n                    .gaga{\n                        -st-extends:Comp;\n                        -st-apply:|my-variant2|;\n                    }\n                ", [{
                        // tslint:disable-next-line:max-line-length
                        message: '"my-variant2" cannot be applied to ".gaga", ".gaga" refers to "$namespace of comp" and "my-variant" can only be spplied to "$namespace of Comp2"',
                        file: 'main.css'
                    }]);
            });
            xit('variant cannot be used with params', function () {
                expectWarnings("\n                    :import{\n                        -st-from:\"./file\";\n                        -st-default:Comp;\n                        -st-named:my-variant;\n                    }\n                    .root{\n                        -st-extend:Comp;\n                        -st-mixin:|my-variant(param)|;\n                    }\n                ", [{
                        message: 'invalid mixin arguments: "my-variant" is a variant and does not accept arguments',
                        file: 'main.css'
                    }]);
            });
        });
    });
    describe('selectors', function () {
        // TODO2: next phase
        xit('should not allow conflicting extends', function () {
            expectWarnings("\n                :import {\n                    -st-from: \"./sheetA\";\n                    -st-named: SheetA;\n                }\n                :import {\n                    -st-from: \"./sheetB\";\n                    -st-named: SheetB;\n                }\n                .my-a { -st-extends: SheetA }\n                .my-b { -st-extends: SheetB }\n\n                .my-a.my-b {}\n                SheetA.my-b {}\n                SheetB.my-a {}\n            ", [
                { message: 'conflicting extends matching same target [.my-a.my-b]', file: 'main.css' },
                { message: 'conflicting extends matching same target [SheetA.my-b]', file: 'main.css' },
                { message: 'conflicting extends matching same target [SheetB.my-a]', file: 'main.css' }
            ]);
        });
    });
    describe('transforms', function () {
        it('should return warning if @keyframe symbol is used', function () {
            var config = {
                entry: '/main.css',
                files: {
                    '/main.css': {
                        content: "\n                        .name {}\n                        |@keyframes $name$| {\n                            from {}\n                            to {}\n                        }"
                    }
                }
            };
            expectWarningsFromTransform(config, [{ message: 'symbol name is already in use', file: '/main.css' }]);
        });
        it('should not allow @keyframe of reserved words', function () {
            stylable_utils_1.reservedKeyFrames.map(function (key) {
                var config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: "\n                            |@keyframes $" + key + "$| {\n                                from {}\n                                to {}\n                            }"
                        }
                    }
                };
                expectWarningsFromTransform(config, [{ message: "keyframes " + key + " is reserved", file: '/main.css' }]);
            });
        });
        it('should return error when trying to import theme from js', function () {
            var config = {
                entry: '/main.css',
                files: {
                    '/main.css': {
                        content: "\n                        :import {\n                            -st-theme: true;\n                            |-st-from: $\"./file.js\"$|;\n                        }\n                        "
                    },
                    '/file.js': {
                        content: ""
                    }
                }
            };
            expectWarningsFromTransform(config, [{ message: 'Trying to import unknown file', file: '/main.css' }]);
        });
        it('should error on unresolved alias', function () {
            var config = {
                entry: '/main.st.css',
                files: {
                    '/main.st.css': {
                        namespace: 'entry',
                        content: "\n                            |:import{\n                                -st-from: \"./imported.st.css\";\n                                -st-default: Imported;\n                                -st-named: $inner-class$;\n                            }|\n\n                            .Imported{}\n                            .inner-class{}\n                        "
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: ".root{}"
                    }
                }
            };
            expectWarningsFromTransform(config, [{ message: 'Trying to import unknown alias', file: '/main.st.css' }]);
        });
        it('should not add warning when compose value is a string', function () {
            var config = {
                entry: '/main.css',
                files: {
                    '/main.css': {
                        content: "\n                        :import {\n                            -st-from: \"./imported.css\";\n                            -st-default: myCompose;\n                        }\n                        .container {\n                            |-st-compose: $\"myCompose\"$|;\n                        }\n                        "
                    },
                    '/imported.css': {
                        content: ""
                    }
                }
            };
            expectWarningsFromTransform(config, [{ message: 'value can not be a string (remove quotes?)', file: '/main.css' }]);
        });
    });
});
//# sourceMappingURL=diagnostics.spec.js.map