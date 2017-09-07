import { expect } from "chai";
import { process } from '../src/stylable-processor';
import { safeParse } from "../src/parser";
import { generateFromMock, Config } from "./utils/generate-test-util";
import { Diagnostics } from "../src";
const deindent = require('deindent')
const customButton = `
    .root{
        -st-states:shmover;
    }
    .my-part{

    }
    .my-variant{
        -st-variant:true;
        color:red;
    }
    
`;
const mixins = ``;

interface warning {
    message: string;
    file: string;
}

interface file {
    content: string;
    path: string;
}


function findTestLocations(css: string) {
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
        } else if (ch === '|') {
            if (!start) {
                start = { line, column };
            } else {
                end = { line, column };
            }
        } else if (ch === '$') {
            inWord = !inWord;
            if (inWord) { word = ''; }
        } else if (inWord) {
            word += ch;
        } else {
            column++;
        }
    }
    return { start, end, word, css: css.replace(/[|$]/gm, '') };
}

describe('findTestLocations', () => {

    it('find single location 1', function () {
        var l = findTestLocations('\n  |a|');
        expect(l.start, 'start').to.eql({ line: 2, column: 3 });
        expect(l.end, 'end').to.eql({ line: 2, column: 4 });

    });

    it('find single location 2', function () {
        var l = findTestLocations('\n  |a\n  |');
        expect(l.start, 'start').to.eql({ line: 2, column: 3 });
        expect(l.end, 'end').to.eql({ line: 3, column: 3 });
    });

    it('find single location with word', function () {
        var l = findTestLocations('\n  |$a$\n  |');
        expect(l.start, 'start').to.eql({ line: 2, column: 3 });
        expect(l.end, 'end').to.eql({ line: 3, column: 3 });
        expect(l.word, 'end').to.eql('a');
    });

    it('striped css', function () {
        var css = '\n  |$a$\n  |';
        var l = findTestLocations(css);
        expect(l.css, 'start').to.eql(css.replace(/[|$]/gm, ''));
    });

});


function expectWarnings(css: string, warnings: warning[], extraFiles?: file[]) {
    extraFiles;
    var source = findTestLocations(css);
    var root = safeParse(source.css);
    var res = process(root);

    res.diagnostics.reports.forEach((report, i) => {
        expect(report.message).to.equal(warnings[i].message);
        expect(report.node.source.start, 'start').to.eql(source.start);
        if (source.word !== null) {
            expect(report.options.word).to.eql(source.word);
        }
    });

    expect(res.diagnostics.reports.length, "diagnostics reports match").to.equal(warnings.length);

    // console.log(src, warnings, extraFiles);
}

function expectWarningsFromTransform(config: Config, warnings:warning[]) {
    
    config.trimWS = false;

    let locations:any = {}
    for(var path in config.files) {
        let source = findTestLocations(deindent(config.files[path].content).trim())
        config.files[path].content = source.css
        locations[path] = source
    }
    const diagnostics = new Diagnostics()
    generateFromMock(config, diagnostics)
   
    diagnostics.reports.forEach((report, i) => {
        let path = warnings[i].file
        expect(report.message).to.equal(warnings[i].message);
        expect(report.node.source.start).to.eql(locations[path].start);
        if (locations[path].word !== null) {
            expect(report.options.word).to.eql(locations[path].word);
        }
    })
    expect(diagnostics.reports.length, "diagnostics reports match").to.equal(warnings.length);
}



describe('diagnostics: warnings and errors', function () {

    xdescribe('syntax', function () {

        describe('selectors', function () {
            it('should return warning for unidentified tag selector', function () {
                expectWarnings(`
                    |Something| {

                    }
                `, [{ message: '"Something" component is not imported', file: "main.css" }]);
            });

            it('should return warning for unterminated "."', function () {
                expectWarnings(`
                    .root{

                    }
                    .|
                `, [{ message: "identifier expected", file: "main.css" }]);
            });
            it('should return warning for unterminated ":"', function () {
                expectWarnings(`
                    .root{

                    }
                    :|
                `, [{ message: "identifier expected", file: "main.css" }])
            });
            it('should return warning for className without rule area', function () {
                expectWarnings(`
                    .root{

                    }
                    .gaga|
                `, [{ message: "{ expected", file: "main.css" }])
            });

        });
        describe('ruleset', function () {
            it('should return warning for unterminated ruleset', function () {
                expectWarnings(`
                    .root{

                    }
                    .gaga{
                        color:red|
                `, [{ message: "; expected", file: "main.css" }])
            });
        });
        describe('rules', function () {
            it('should return warning for unterminated rule', function () {
                expectWarnings(`
                    .root{

                    }
                    .gaga{
                        color|
                    }
                `, [{ message: ": expected", file: "main.css" }])
                expectWarnings(`
                    .root{

                    }
                    .gaga{
                        color:|
                    }
                `, [{ message: "property value expected", file: "main.css" }])
                // todo: add cases for any unterminated selectors (direct descendant, etc...)
            });
            it('should return warning for unknown rule', function () {
                expectWarnings(`
                    .root{
                        |hello|:yossi;
                    }
                `, [{ message: 'unknown rule "hello"', file: "main.css" }])
            });

            it('should warn when using illegal characters', function () {
                expectWarnings(`
                    <|{

                    }
                `, [{ message: 'illegal character <', file: "main.css" }])
            });

            it('should return warning for unknown directive', function () {
                expectWarnings(`
                    .gaga{
                        |-st-something|:true;
                    }
                `, [{ message: 'unknown directive "-st-something"', file: "main.css" }])
            })
        });
        describe('states', function () {
            it('should return warning for state without selector', function () {
                expectWarnings(`
                    |:hover|{

                    }
                `, [{ message: 'global states are not supported, use .root:hover instead', file: "main.css" }])
            });

            it('should return warning for unknown state', function () {
                expectWarnings(`
                    .root:|shmover|{

                    }
                `, [{ message: 'unknown state "shmover"', file: "main.css" }])
            });
        });
        describe('pseudo selectors', function () {
            it('should return warning for native pseudo elements without selector', function () {
                expectWarnings(`
                    |::before|{

                    }
                `, [{ message: 'global pseudo elements are not allowed, you can use ".root::before" instead', file: "main.css" }])
            });

            it('should return warning for unknown pseudo element', function () {
                expectWarnings(`
                    .root::|mybtn|{

                    }
                `, [{ message: 'unknown pseudo element "mybtn"', file: "main.css" }])
            });

            it('should return warning for unknown pseudo element', function () {
                expectWarnings(`
                    .root::|mybtn|{

                    }
                `, [{ message: 'unknown pseudo element "mybtn"', file: "main.css" }])
            });
        });

    })

    describe('structure', function () {

        describe('root', function () {
            it('should return warning for ".root" after selector', function () {
                expectWarnings(`
                    |.gaga .root|{}                    
                `, [{ message: '.root class cannot be used after spacing', file: "main.css" }])
            });
        });

        describe('-st-states', function () {
            it('should return warning when defining states in complex selector', function () {
                expectWarnings(`
                    .gaga:hover{
                        |-st-states|:shmover;
                    }
                `, [{ message: 'cannot define pseudo states inside complex selectors', file: "main.css" }])
            });
            xit('should warn when defining states on element selector', function () {
                expectWarnings(`
                    MyElement{
                        |-st-states|:shmover;
                    }
                `, [{ message: 'cannot define pseudo states inside complex selectors', file: "main.css" }])
            });
        });

        describe('-st-mixin', function () {
            it('should return warning for unknown mixin', function () {
                expectWarnings(`
                    .gaga{
                        |-st-mixin: $myMixin$|;
                    }
                `, [{ message: 'unknown mixin: "myMixin"', file: "main.css" }])
            });

        });

        describe(':vars', function () {
            it('should return warning for unknown var', function () {
                expectWarnings(`
                    .gaga{
                        |color:value($myColor$)|;
                    }
                `, [{ message: 'unknown var "myColor"', file: "main.css" }])
            });
            it('should return warning for unresolvable var', function () {
                expectWarnings(`
                    :vars{
                        |myvar: $value(myvar)$|;
                    }
                `, [{ message: 'cannot resolve variable value for "myvar"', file: "main.css" }])
            });

            it('should return warning when defined in a complex selector', function () {
                expectWarnings(`
                    |.gaga:vars|{
                        myColor:red;
                    }
                    
                `, [{ message: 'cannot define ":vars" inside a complex selector', file: "main.css" }])
            });
            it('should return warning if var symbol is used', function(){
                let config = {
                    entry:'/main.css', 
                    files: {
                        '/main.css': {
                            content: `
                               .a {}
                               :vars {
                                 |$a$: red|;
                                }
                          `
                        }
                }}
                expectWarningsFromTransform(config, [{message:'symbol a is already in use', file:'/main.css'}])
            })
        });

        xdescribe('-st-variant', function () {
            it('should return warning when defining variant in complex selector', function () {
                expectWarnings(`
                    .gaga:hover{
                        |-st-variant|:true;
                    }
                `, [{ message: 'cannot define "-st-variant" inside complex selector', file: "main.css" }])
            });

            it('should return warning when -st-variant value is not true or false', function () {
                expectWarnings(`
                    .gaga {
                        -st-variant:|red|;
                    }
                `, [{ message: '-st-variant can only be true or false, the value "red" is illegal', file: "main.css" }])
            });
        });

        describe(':import', function () {
            it('should return warning when defined in a complex selector', function () {
                expectWarnings(`
                    |.gaga:import|{
                        -st-from:"./file";
                        -st-default:Theme;
                    }
                `, [{ message: 'cannot define ":import" inside a complex selector', file: "main.css" }])
            })
            xit('should return warning for non import rules inside imports', function () {

                expectWarnings(`
                    :import{
                        -st-from:"./file";
                        -st-default:Comp;
                        |$color$:red;|
                    }
                `, [{ message: '"color" css attribute cannot be used inside :import block', file: "main.css" }]
                    , [{ content: customButton, path: 'file.css' }])

            });

            it('should return warning for import with missing "from"', function () {
                expectWarnings(`

                    |:import{
                        -st-default:Comp;
                    }
                `, [{ message: '"-st-from" is missing in :import block', file: "main.css" }]
                    , [{ content: customButton, path: 'file.css' }])

            });

        });

        describe('-st-extends', function () {
            it('should return warning when defined under complex selector', function () {
                expectWarnings(`
                    :import{
                        -st-from:"./file";
                        -st-default:Comp;
                    }
                    .root:hover{
                        |-st-extends|:Comp;
                    }
                `, [{ message: 'cannot define "-st-extends" inside a complex selector', file: "main.css" }]
                    , [{ content: customButton, path: 'file.css' }])

            });
            xit('should warn on not imported extends', function () {
                expectWarnings(`
                    .root {
                        |-st-extends: $Comp$|;
                    }
                `, [{ message: 'cannot resolve extends type for "Comp"', file: "main.css" }]
                )

            });

        });

        describe('override -st-* warnings', function () {

            it('should warn on typed class extend override', function () {
                expectWarnings(`
                    :import {
                        -st-from : './file.css';
                        -st-default: Comp;
                    }
                    .root {
                        -st-extends: Comp;
                    }
                    .root {
                        |-st-extends: Comp;|
                    }
                `, [{ message: 'override "-st-extends" on typed rule "root"', file: "main.css" }])
            });

            it('should warn on typed class states override', function () {
                expectWarnings(`
                    
                    .root {
                        -st-states: mystate;
                    }
                    .root {
                        |-st-states: mystate2;|
                    }
                `, [{ message: 'override "-st-states" on typed rule "root"', file: "main.css" }])
            });

        })

    });


    describe('redeclare symbols', function () {

        xit('should warn override mixin on same rule', function () {
            expectWarnings(`
                   .a {}
                   .b {
                       -st-mixin: a;
                       -st-mixin: a;
                   }
                `, [{ message: 'override mixin on same rule', file: "main.css" }])
        })

        describe('from import', function () {

            it('should warn when import redeclare same symbol (in same block)', function () {
                expectWarnings(`
                    |:import {
                        -st-from: './file.css';
                        -st-default: name;
                        -st-named: $name$;
                    }
                `, [{ message: 'redeclare symbol "name"', file: "main.css" }])
            });

            it('should warn when import redeclare same symbol (in different block)', function () {
                expectWarnings(`
                    :import {
                        -st-from: './file.css';
                        -st-default: name;
                    }
                    |:import {
                        -st-from: './file.css';
                        -st-default: $name$;
                    }
                `, [{ message: 'redeclare symbol "name"', file: "main.css" }])
            });


            it('should warn when import redeclare same symbol (in different block types)', function () {
                expectWarnings(`
                    :import {
                        -st-from: './file.css';
                        -st-default: name;
                    }
                    :vars {
                        |$name$: red;
                    }
                `, [{ message: 'redeclare symbol "name"', file: "main.css" }])
            });

        });

    });


    xdescribe('complex examples', function () {
        describe(':import', function () {

            it('should return warning for unknown file', function () {
                expectWarnings(`

                    :import{
                        -st-from:|"./file"|;
                        -st-default:Theme;
                    }
                `, [{ message: 'could not find file "./file"', file: "main.css" }])
            });

            it('should return warning for unknown import', function () {
                expectWarnings(`
                    :import{
                        -st-from:"./file";
                        -st-default:Comp;
                        -st-named:|variant|;
                    }
                `, [{ message: 'cannot find export "variant" in "./file"', file: "main.css" }]
                    , [{ content: customButton, path: 'file.css' }]);
            });

        });
        describe('cross variance', function () {

            it('variant cannot be used as var', function () {
                expectWarnings(`
                    :import{
                        -st-from:"./file";
                        -st-default:Comp;
                        -st-named:my-variant;
                    }
                    .root{
                        color:|value(my-variant)|;
                    }
                `, [{ message: '"my-variant" is a variant and cannot be used as a var', file: "main.css" }]
                    , [{ content: customButton, path: 'file.css' }])

            });

            it('mixin cannot be used as var', function () {
                expectWarnings(`
                    :import{
                        -st-from:"./mixins";
                        -st-named:my-mixin;
                    }
                    .root{
                        color:|value(my-mixin)|;
                    }
                `, [{ message: '"my-mixin" is a mixin and cannot be used as a var', file: "main.css" }]
                    , [{ content: mixins, path: 'mixins.ts' }])

            });

            it('mixin cannot be used as stylesheet', function () {
                expectWarnings(`
                    :import{
                        -st-from:"./mixins";
                        -st-named:my-mixin;
                    }
                    .root{
                        -st-extend:|my-mixin|;
                    }
                `, [{ message: '"my-mixin" is a mixin and cannot be used as a stylesheet', file: "main.css" }]
                    , [{ content: mixins, path: 'mixins.ts' }])

            });

            it('stylesheet cannot be used as var', function () {
                expectWarnings(`
                    :import{
                        -st-from:"./file";
                        -st-default:Comp;
                    .root{
                        color:|value(Comp)|;
                    }
                `, [{ message: '"Comp" is a stylesheet and cannot be used as a var', file: "main.css" }]
                    , [{ content: customButton, path: 'file.css' }])

            });

            it('stylesheet cannot be used as mixin', function () {
                expectWarnings(`
                    :import{
                        -st-from:"./file";
                        -st-default:Comp;
                        -st-named:my-variant;
                    }
                    .root{
                        -st-mixin:|Comp|;
                    }
                `, [{ message: '"Comp" is a stylesheet and cannot be used as a mixin', file: "main.css" }]
                    , [{ content: customButton, path: 'file.css' }])

            });

            it('component variant cannot be used for native node', function () {
                expectWarnings(`
                    :import{
                        -st-from:"./file";
                        -st-default:Comp;
                        -st-named:my-variant;
                    }
                    
                    .gaga{
                        -st-mixin:|my-variant|;
                    }
                `, [{
                        message: '"my-variant" cannot be applied to ".gaga", ".gaga" refers to a native node and "my-variant" can only be spplied to "$namespace of comp"',
                        file: "main.css"
                    }]
                    , [{ content: customButton, path: 'file.css' }])

            });

            it('variants can only be used for a specific component', function () {
                expectWarnings(`
                    :import{
                        -st-from:"./file";
                        -st-default:Comp;
                        -st-named:my-variant;
                    }
                    :import{
                        -st-from:"./file2";
                        -st-default:Comp2;
                        -st-named:my-variant2;
                    }
                    .gaga{
                        -st-extends:Comp;
                        -st-apply:|my-variant2|;
                    }
                `, [{
                        message: '"my-variant2" cannot be applied to ".gaga", ".gaga" refers to "$namespace of comp" and "my-variant" can only be spplied to "$namespace of Comp2"',
                        file: "main.css"
                    }]
                    , [
                        { content: customButton, path: 'file.css' }, { content: customButton, path: 'file2.css' }])

            });

            it('variant cannot be used with params', function () {
                expectWarnings(`
                    :import{
                        -st-from:"./file";
                        -st-default:Comp;
                        -st-named:my-variant;
                    }
                    .root{
                        -st-extend:Comp;
                        -st-mixin:|my-variant(param)|;
                    }
                `, [{ message: 'invalid mixin arguments: "my-variant" is a variant and does not accept arguments', file: "main.css" }])

            });

            it('mixins cant be used with wrong number of params', function () {
                expectWarnings(`
                    :import{
                        -st-from:"./mixins";
                        -st-named:mixinWith2Args;
                    }
                    .root{
                        -st-mixin:|mixinWith2Args(param)|;
                    }
                `, [{ message: 'invalid mixin arguments: "mixinWith2Args" expects 2 arguments but recieved 1', file: "main.css" }]
                    , [{ content: mixins, path: 'mixins.ts' }])

            });

            it('error running mixin', function () {
                expectWarnings(`
                    :import{
                        -st-from:"./mixins";
                        -st-named:mixinThatExplodes;
                    }
                    .root{
                        -st-mixin:|mixinThatExplodes(param)|;
                    }
                `, [{ message: '"mixinThatExplodes" has thrown an error: error text', file: "main.css" }]
                    , [{ content: mixins, path: 'mixins.ts' }])

            });

        });

    });

    describe('selectors', function () {

        xit('should not allow conflicting extends', function () {
            expectWarnings(`
                :import {
                    -st-from: "./sheetA";
                    -st-named: SheetA;
                }
                :import {
                    -st-from: "./sheetB";
                    -st-named: SheetB;
                }
                .my-a { -st-extends: SheetA }
                .my-b { -st-extends: SheetB }

                .my-a.my-b {}
                SheetA.my-b {}
                SheetB.my-a {}
            `, [
                    { message: 'conflicting extends matching same target [.my-a.my-b]', file: "main.css" },
                    { message: 'conflicting extends matching same target [SheetA.my-b]', file: "main.css" },
                    { message: 'conflicting extends matching same target [SheetB.my-a]', file: "main.css" }
                ]
                , [
                    { content: '.root{}', path: 'sheetA.ts' },
                    { content: '.root{}', path: 'sheetB.ts' }
                ]);
        });

    });

    describe('transforms', function() {
        it('should return warning if @keyframe symbol is used', function(){
            let config = {
                entry:'/main.css', 
                files: {
                    '/main.css': {
                        content: `
                        .name {}
                        |@keyframes $name$| {
                            from {}
                            to {}
                        }`
                    }
            }}
            expectWarningsFromTransform(config, [{message:'symbol name is already in use', file:'/main.css'}])
        })
        // it('should return erro ')
    })


});
