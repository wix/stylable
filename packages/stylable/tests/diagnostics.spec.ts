import { expect } from 'chai';
import { valueMapping } from '../src';
import {
    nativeFunctionsDic,
    nativePseudoElements,
    reservedKeyFrames
} from '../src/native-reserved-lists';
import { resolve } from '../src/path';
import { processorWarnings } from '../src/stylable-processor';
import { valueParserWarnings } from '../src/stylable-value-parsers';
import {
    expectWarnings,
    expectWarningsFromTransform,
    findTestLocations
} from './utils/diagnostics';
import { Config } from './utils/generate-test-util';

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

describe('findTestLocations', () => {

    it('find single location 1', () => {
        const l = findTestLocations('\n  |a|');
        expect(l.start, 'start').to.eql({ line: 2, column: 3 });
        expect(l.end, 'end').to.eql({ line: 2, column: 4 });

    });

    it('find single location 2', () => {
        const l = findTestLocations('\n  |a\n  |');
        expect(l.start, 'start').to.eql({ line: 2, column: 3 });
        expect(l.end, 'end').to.eql({ line: 3, column: 3 });
    });

    it('find single location with word', () => {
        const l = findTestLocations('\n  |$a$\n  |');
        expect(l.start, 'start').to.eql({ line: 2, column: 3 });
        expect(l.end, 'end').to.eql({ line: 3, column: 3 });
        expect(l.word, 'end').to.eql('a');
    });

    it('striped css', () => {
        const css = '\n  |$a$\n  |';
        const l = findTestLocations(css);
        expect(l.css, 'start').to.eql(css.replace(/[|$]/gm, ''));
    });

});

describe('diagnostics: warnings and errors', () => {
    // TODO2: next phase
    describe('syntax', () => {

        xdescribe('selectors', () => {
            it('should return warning for unidentified tag selector', () => {
                expectWarnings(`
                    |Something| {

                    }
                `, [{ message: '"Something" component is not imported', file: 'main.css' }]);
            });

            it('should return warning for unterminated "."', () => {
                expectWarnings(`
                    .root{

                    }
                    .|
                `, [{ message: 'identifier expected', file: 'main.css' }]);
            });
            it('should return warning for unterminated ":"', () => {
                expectWarnings(`
                    .root{

                    }
                    :|
                `, [{ message: 'identifier expected', file: 'main.css' }]);
            });
            it('should return warning for className without rule area', () => {
                expectWarnings(`
                    .root{

                    }
                    .gaga|
                `, [{ message: '{ expected', file: 'main.css' }]);
            });

        });
        xdescribe('ruleset', () => {
            it('should return warning for unterminated ruleset', () => {
                expectWarnings(`
                    .root{

                    }
                    .gaga{
                        color:red|
                `, [{ message: '; expected', file: 'main.css' }]);
            });
        });
        xdescribe('rules', () => {
            it('should return warning for unterminated rule', () => {
                expectWarnings(`
                    .root{

                    }
                    .gaga{
                        color|
                    }
                `, [{ message: ': expected', file: 'main.css' }]);
                expectWarnings(`
                    .root{

                    }
                    .gaga{
                        color:|
                    }
                `, [{ message: 'property value expected', file: 'main.css' }]);
                // todo: add cases for any unterminated selectors (direct descendant, etc...)
            });
            it('should return warning for unknown rule', () => {
                expectWarnings(`
                    .root{
                        |hello|:yossi;
                    }
                `, [{ message: 'unknown rule "hello"', file: 'main.css' }]);
            });

            it('should warn when using illegal characters', () => {
                expectWarnings(`
                    <|{

                    }
                `, [{ message: 'illegal character <', file: 'main.css' }]);
            });

            it('should return warning for unknown directive', () => {
                expectWarnings(`
                    .gaga{
                        |-st-something|:true;
                    }
                `, [{ message: 'unknown directive "-st-something"', file: 'main.css' }]);
            });
        });
        describe('pseudo selectors', () => {
            xit('should return warning for native pseudo elements without selector', () => {
                expectWarnings(`
                    |::before|{

                    }
                `, [{
                        message: 'global pseudo elements are not allowed, you can use ".root::before" instead',
                        file: 'main.css'
                    }]);
            });

            describe('elements', () => {
                it('should return a warning for an unknown pseudo element', () => {
                    const config = {
                        entry: '/main.css',
                        files: {
                            '/main.css': {
                                content: `
                                |.root::$myBtn$|{

                                }`
                            }
                        }
                    };
                    expectWarningsFromTransform(
                        config,
                        [{ message: 'unknown pseudo element "myBtn"', file: '/main.css' }]
                    );
                });
                it('should not warn on vendor prefixed pseudo element', () => {
                    const config = {
                        entry: '/main.css',
                        files: {
                            '/main.css': {
                                content: `
                                .root::-webkit-element{

                                }`
                            }
                        }
                    };
                    expectWarningsFromTransform(
                        config,
                        []
                    );
                });
                it('should not warn on vendor prefixed pseudo class', () => {
                    const config = {
                        entry: '/main.css',
                        files: {
                            '/main.css': {
                                content: `
                                .root:-webkit-hover{

                                }`
                            }
                        }
                    };
                    expectWarningsFromTransform(
                        config,
                        []
                    );
                });
                nativePseudoElements.forEach(nativeElement => {
                    it(`should not return a warning for native ${nativeElement} pseudo element`, () => {
                        const selector = `|.root::$${nativeElement}$|{`;
                        const config = {
                            entry: '/main.css',
                            files: {
                                '/main.css': {
                                    content: `
                                    ${selector}
                                    }`
                                }
                            }
                        };
                        expectWarningsFromTransform(config, []);
                    });
                });
            });
        });
    });

    describe('structure', () => {

        describe('root', () => {
            it('should return warning for ".root" after a selector', () => {
                expectWarnings(`
                    |.gaga .root|{}
                `, [{ message: processorWarnings.ROOT_AFTER_SPACING(), file: 'main.css' }]);
            });

            it('should return warning for ".root" after global and local classes', () => {
                expectWarnings(`
                    |:global(*) .x .root|{}
                `, [
                    { message: processorWarnings.ROOT_AFTER_SPACING(), file: 'main.css' }
                ]);
            });

            it('should return warning for ".root" after a global and element', () => {
                expectWarnings(`
                    |:global(*) div .root|{}
                `, [
                    { message: processorWarnings.UNSCOPED_ELEMENT('div'), file: 'main.css' },
                    { message: processorWarnings.ROOT_AFTER_SPACING(), file: 'main.css' }
                ]);
            });

            it('should not return warning for ".root" after a global selector', () => {
                expectWarnings(`
                    :global(*) .root{}
                `, []);
            });

            it('should not return warning for ".root" after a complex global selector', () => {
                expectWarnings(`
                    :global(body[dir="rtl"] > header) .root {}
                `, []);
            });
        });

        describe('-st-mixin', () => {
            it('should return warning for unknown mixin', () => {
                expectWarnings(`
                    .gaga{
                        |-st-mixin: $myMixin$|;
                    }
                `, [{ message: 'unknown mixin: "myMixin"', file: 'main.css' }]);
            });

            it('should return a warning for a CSS mixin using un-named params', () => {
                expectWarnings(`
                    .mixed {
                        color: red;
                    }
                    .gaga{
                        |-st-mixin: mixed($1$)|;
                    }

                `, [{
                    message: valueParserWarnings.CSS_MIXIN_FORCE_NAMED_PARAMS(),
                    file: 'main.css'
                }]);
            });

            it('should add error when can not append css mixins', () => {
                const config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: `
                            :import {
                                -st-from: "./imported.st.css";
                                |-st-named: $my-mixin$;|
                            }
                            .container {
                                -st-mixin: my-mixin;
                            }
                            `
                        },
                        '/imported.st.css': {
                            content: ``
                        }
                    }
                };
                expectWarningsFromTransform(config, [{ message: 'import mixin does not exist', file: '/main.css' }]);
            });

            it('should add error on circular mixins', () => {
                const config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: `
                            .x {
                                -st-mixin: y;
                            }
                            .y {
                                -st-mixin: x;
                            }
                            `
                        }
                    }
                };
                const mainPath = resolve('/main.css');
                const xPath = `y from ${mainPath} --> x from ${mainPath}`;
                const yPath = `x from ${mainPath} --> y from ${mainPath}`;
                expectWarningsFromTransform(config, [
                    { message: `circular mixin found: ${xPath}`, file: '/main.css', skipLocationCheck: true },
                    { message: `circular mixin found: ${yPath}`, file: '/main.css', skipLocationCheck: true }
                ]);
            });

            it('should add diagnostics when there is a bug in mixin', () => {
                const config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: `
                            :import {
                                -st-from: "./imported.js";
                                -st-default: myMixin;
                            }
                            |.container {
                                -st-mixin: $myMixin$;
                            }|
                            `
                        },
                        '/imported.js': {
                            content: `
                                module.exports = function(){
                                    throw 'bug in mixin'
                                }
                            `
                        }
                    }
                };
                expectWarningsFromTransform(config,
                    [{ message: 'could not apply mixin: bug in mixin', file: '/main.css' }]);
            });

            it('js mixin must be a function', () => {
                const config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: `
                            :import {
                                -st-from: "./imported.js";
                                -st-named: myMixin;
                            }
                            |.container {
                                -st-mixin: $myMixin$;
                            }|
                            `
                        },
                        '/imported.js': {
                            content: `

                            `
                        }
                    }
                };
                expectWarningsFromTransform(config, [{ message: 'js mixin must be a function', file: '/main.css' }]);
            });

            it('should not add warning when mixin value is a string', () => {
                const config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: `
                            :import {
                                -st-from: "./imported.js";
                                -st-default: myMixin;
                            }
                            .container {
                                |-st-mixin: $"myMixin"$|;
                            }
                            `
                        },
                        '/imported.js': {
                            content: ``
                        }
                    }
                };
                expectWarningsFromTransform(config,
                    [{ message: valueParserWarnings.VALUE_CANNOT_BE_STRING(), file: '/main.css' }]);
            });
        });

        describe(':vars', () => {
            it('should return warning when defined in a complex selector', () => {
                expectWarnings(`
                |.gaga:vars|{
                    myColor:red;
                }

                `, [{ message: processorWarnings.FORBIDDEN_DEF_IN_COMPLEX_SELECTOR(':vars'), file: 'main.css' }]);
            });
        });

        xdescribe('-st-variant', () => {
            it('should return warning when defining variant in complex selector', () => {
                expectWarnings(`
                    .gaga:hover{
                        |-st-variant|:true;
                    }
                `, [{ message: processorWarnings.FORBIDDEN_DEF_IN_COMPLEX_SELECTOR('-st-variant'), file: 'main.css' }]);
            });

            it('should return warning when -st-variant value is not true or false', () => {
                expectWarnings(`
                    .gaga {
                        -st-variant:|red|;
                    }
                `,
                    [{
                        message: '-st-variant can only be true or false, the value "red" is illegal',
                        file: 'main.css'
                    }]);
            });
        });

        describe(':import', () => {
            it('should return warning when defined in a complex selector', () => {
                expectWarnings(`
                    |.gaga:import|{
                        -st-from:"./file.st.css";
                        -st-default:Theme;
                    }
                `, [{ message: processorWarnings.FORBIDDEN_DEF_IN_COMPLEX_SELECTOR(':import'), file: 'main.css' }]);
            });

            it('should return warning when default import is defined with a lowercase first letter', () => {
                expectWarnings(`
                    |:import{
                        -st-from:"./file.st.css";
                        -st-default: $theme$;
                    }|
                `, [{ message: processorWarnings.DEFAULT_IMPORT_IS_LOWER_CASE(), file: 'main.css' }]);
            });

            it('should return warning for non import rules inside imports', () => {
                const config = {
                    entry: '/main.st.css',
                    files: {
                        '/main.st.css': {
                            content: `
                            :import{
                                -st-from:"./file.st.css";
                                -st-default:Comp;
                                |$color$:red;|
                            }
                          `
                        },
                        '/file.st.css': {
                            content: customButton
                        }
                    }
                };
                expectWarningsFromTransform(config,
                    [{ message: processorWarnings.ILLEGAL_PROP_IN_IMPORT('color'), file: '/main.st.css' }]);
            });

            it('should return warning for import with missing "from"', () => {
                expectWarnings(`

                    |:import{
                        -st-default:Comp;
                    }
                `, [{ message: processorWarnings.FROM_PROP_MISSING_IN_IMPORT(), file: 'main.st.css' }]
                );

            });

        });

        describe('-st-extends', () => {
            it('should return warning when defined under complex selector', () => {
                expectWarnings(`
                    :import{
                        -st-from:"./file";
                        -st-default:Comp;
                    }
                    .root:hover{
                        |-st-extends|:Comp;
                    }
                `, [{ message: processorWarnings.FORBIDDEN_DEF_IN_COMPLEX_SELECTOR('-st-extends'), file: 'main.css' }]);
            });

            it('Only import of type class can be used to extend', () => {
                const config = {
                    entry: '/main.st.css',
                    files: {
                        '/main.st.css': {
                            content: `
                            :import {
                                -st-from: './file.st.css';
                                -st-named: special;
                            }
                            .myclass {
                                |-st-extends: $special$|;
                            }
                            `
                        },
                        '/file.st.css': {
                            content: `
                                :vars {
                                    special: red
                                }
                            `
                        }
                    }
                };
                expectWarningsFromTransform(config, [{ message: 'import is not extendable', file: '/main.st.css' }]);
            });
            it('should warn if extends by js import', () => {
                const config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: `
                            :import {
                                -st-from: './file.js';
                                -st-default: special;
                            }
                            .myclass {
                                |-st-extends: $special$|
                            }
                            `
                        },
                        '/file.js': {
                            content: ``
                        }
                    }
                };
                expectWarningsFromTransform(config, [{ message: 'JS import is not extendable', file: '/main.css' }]);
            });
            it('should warn if named extends does not exist', () => {
                const config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: `
                            :import {
                                -st-from: './file.st.css';
                                |-st-named: $special$;|
                            }
                            .myclass {
                                -st-extends: special;
                            }
                            `
                        },
                        '/file.st.css': {
                            content: `
                                .notSpecial {
                                    color: red;
                                }
                            `
                        }
                    }
                };
                expectWarningsFromTransform(config, [{ message: `Could not resolve 'special'`, file: '/main.css' }]);
            });
            it('should warn if file not found', () => {
                const config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: `
                            :import {
                                |-st-from: $'./file.css'$|;
                                -st-default: Special;
                            }
                            .myclass {
                                -st-extends: Special
                            }
                            `
                        }
                    }
                };
                expectWarningsFromTransform(config,
                    [{ message: `Imported file '${resolve('/file.css')}' not found`, file: '/main.css' }]);
            });
        });

        describe('override -st-* warnings', () => {

            it('should warn on typed class extend override', () => {
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
                `, [
                    { message: processorWarnings.OVERRIDE_TYPED_RULE(valueMapping.extends, 'root'), file: 'main.css' }
                ]);
            });
        });
    });

    describe('redeclare symbols', () => {
        it('should warn override mixin on same rule', () => {
            const config = {
                entry: '/main.css',
                files: {
                    '/main.css': {
                        content: `
                        .a {}
                        .b {
                            -st-mixin: a;
                            |-st-mixin: a|;
                        }
                      `
                    },
                    'file.css': {
                        content: customButton
                    }
                }
            };
            expectWarningsFromTransform(config, [{ message: processorWarnings.OVERRIDE_MIXIN(), file: '/main.css' }]);
        });

        describe('from import', () => {
            it('should warn for unknown import', () => {
                const config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: `
                            :import{
                                -st-from:"./import.css";
                                |-st-named: shlomo, $momo$;|
                            }
                            .myClass {
                                -st-extends: shlomo;
                            }
                            .myClass1 {
                                -st-extends: momo;
                            }
                          `
                        },
                        '/import.css': {
                            content: `
                                .shlomo {
                                    color: red
                                }
                            `
                        }
                    }
                };
                expectWarningsFromTransform(config, [{ message: `Could not resolve 'momo'`, file: '/main.css' }]);
            });

            it('should warn when import redeclare same symbol (in same block)', () => {
                expectWarnings(`
                    |:import {
                        -st-from: './file.css';
                        -st-default: Name;
                        -st-named: $Name$;
                    }
                `, [{ message: processorWarnings.REDECLARE_SYMBOL('Name'), file: 'main.css' }]);
            });

            it('should warn when import redeclare same symbol (in different block)', () => {
                expectWarnings(`
                    :import {
                        -st-from: './file.css';
                        -st-default: Name;
                    }
                    |:import {
                        -st-from: './file.css';
                        -st-default: $Name$;
                    }
                `, [{ message: processorWarnings.REDECLARE_SYMBOL('Name'), file: 'main.css' }]);
            });

            it('should warn when import redeclare same symbol (in different block types)', () => {
                expectWarnings(`
                    :import {
                        -st-from: './file.css';
                        -st-default: Name;
                    }
                    :vars {
                        |$Name$: red;
                    }
                `, [{ message: processorWarnings.REDECLARE_SYMBOL('Name'), file: 'main.css' }]);
            });

        });

    });

    describe('complex examples', () => {
        describe(':import', () => {
            it('should return warning for unknown var import', () => {
                const config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: `
                            :import{
                                -st-from:"./file.css";
                                -st-default:Comp;
                                |-st-named:$myVar$|;
                            }
                            .root {
                                color:value(myVar);
                            }`
                        },
                        '/file.css': {
                            content: customButton
                        }
                    }
                };
                expectWarningsFromTransform(config,
                    [{ message: `cannot find export 'myVar' in './file.css'`, file: '/main.css' }]);

            });

        });
        describe('cross variance', () => {

            xit('component variant cannot be used for native node', () => {
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
                        // tslint:disable-next-line:max-line-length
                        message: '"my-variant" cannot be applied to ".gaga", ".gaga" refers to a native node and "my-variant" can only be spplied to "$namespace of comp"',
                        file: 'main.css'
                    }]
                );

            });

            xit('variants can only be used for a specific component', () => {
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
                        // tslint:disable-next-line:max-line-length
                        message: '"my-variant2" cannot be applied to ".gaga", ".gaga" refers to "$namespace of comp" and "my-variant" can only be spplied to "$namespace of Comp2"',
                        file: 'main.css'
                    }]
                );

            });

        });

    });

    describe('selectors', () => {
        // TODO2: next phase
        xit('should not allow conflicting extends', () => {
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
                    { message: 'conflicting extends matching same target [.my-a.my-b]', file: 'main.css' },
                    { message: 'conflicting extends matching same target [SheetA.my-b]', file: 'main.css' },
                    { message: 'conflicting extends matching same target [SheetB.my-a]', file: 'main.css' }
                ]
            );
        });

        describe('root scoping disabled', () => {
            it('should not warn when using native elements with root scoping', () => {
                expectWarnings(`
                    .root button {}
                `, []);
            });

            it('should not warn when using native elements after scoping', () => {
                expectWarnings(`
                    .class {}
                    .class button {}
                `, []);
            });

            it('should warn when using imported elements (classes) without scoping', () => {
                expectWarnings(`
                    :import {
                        -st-from: "./blah.st.css";
                        -st-named: Blah;
                    }

                    |.$Blah$| {}
                `, [
                    { message: processorWarnings.UNSCOPED_CLASS('Blah'), file: 'main.css' }

                ]);
            });

            it('should warn regardless if using a global before the element', () => {
                expectWarnings(`
                    |:global(div) $button$| {}
                `, [
                    { message: processorWarnings.UNSCOPED_ELEMENT('button'), file: 'main.css' }
                ]);
            });

            it('should warn when using imported element with no root scoping', () => {
                expectWarnings(`
                    :import {
                        -st-from: "./blah.st.css";
                        -st-default: Blah;
                    }

                    |$Blah$| {}
                `, [
                    { message: processorWarnings.UNSCOPED_ELEMENT('Blah'), file: 'main.css' }
                ]);
            });

            it('should warn when using native elements without scoping', () => {
                expectWarnings(`
                    |$button$| {}
                `, [
                    { message: processorWarnings.UNSCOPED_ELEMENT('button'), file: 'main.css' }
                ]);
            });

            it('should warn when using imported elements (classes) without scoping', () => {
                expectWarnings(`
                    :import {
                        -st-from: "./blah.st.css";
                        -st-named: blah;
                    }

                    |.$blah$| {}
                `, [
                    { message: processorWarnings.UNSCOPED_CLASS('blah'), file: 'main.css' }
                ]);
            });
        });
    });

    describe('transforms', () => {
        it('should return warning if @keyframe symbol is used', () => {
            const config = {
                entry: '/main.css',
                files: {
                    '/main.css': {
                        content: `
                        .name {}
                        |@keyframes $name$| {
                            from {}
                            to {}
                        }`
                    }
                }
            };
            expectWarningsFromTransform(config, [{ message: 'symbol name is already in use', file: '/main.css' }]);
        });

        it('should not allow @keyframe of reserved words', () => {
            reservedKeyFrames.map(key => {
                const config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: `
                            |@keyframes $${key}$| {
                                from {}
                                to {}
                            }`
                        }
                    }
                };
                expectWarningsFromTransform(config, [{ message: `keyframes ${key} is reserved`, file: '/main.css' }]);
            });
        });

        it('should return error when trying to import theme from js', () => {
            const config = {
                entry: '/main.css',
                files: {
                    '/main.css': {
                        content: `
                        :import {
                            -st-theme: true;
                            |-st-from: $"./file.js"$|;
                        }
                        `
                    },
                    '/file.js': {
                        content: ``
                    }
                }
            };
            expectWarningsFromTransform(config, [{ message: 'Trying to import unknown file', file: '/main.css' }]);
        });

        it('should error on unresolved alias', () => {
            const config = {
                entry: '/main.st.css',
                files: {
                    '/main.st.css': {
                        namespace: 'entry',
                        content: `
                            |:import{
                                -st-from: "./imported.st.css";
                                -st-default: Imported;
                                -st-named: $inner-class$;
                            }|

                            .root .Imported{}
                            .root .inner-class{}
                        `
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `.root{}`
                    }
                }
            };
            expectWarningsFromTransform(config, [{ message: 'Trying to import unknown alias', file: '/main.st.css' }]);
        });

        it('should not add warning when compose value is a string', () => {
            const config = {
                entry: '/main.st.css',
                files: {
                    '/main.st.css': {
                        content: `
                        :import {
                            -st-from: "./imported.st.css";
                            -st-default: MyCompose;
                        }
                        .container {
                            |-st-compose: $"MyCompose"$|;
                        }
                        `
                    },
                    '/imported.st.css': {
                        content: ``
                    }
                }
            };
            expectWarningsFromTransform(config,
                [{ message: valueParserWarnings.VALUE_CANNOT_BE_STRING(), file: '/main.st.css' }]);
        });

    });

    describe('functions', () => {
        describe('value()', () => {
            // TODO: Is there a difference in issuing warnings from process vs. transform?
            it('should return warning when passing more than one argument to a value() function', () => {
                expectWarningsFromTransform({
                    entry: '/style.st.css',
                    files: {
                        '/style.st.css': {
                            content: `
                            :vars {
                                color1: red;
                                color2: gold;
                            }
                            .my-class {
                                |color:value($color1, color2$)|;
                            }
                            `
                        }
                    }
                }, [{
                    message: 'value function accepts only a single argument: "value(color1, color2)"',
                    file: '/style.st.css'
                }]);
            });

            it('should return warning for unknown var on transform', () => {
                expectWarningsFromTransform({
                    entry: '/style.st.css',
                    files: {
                        '/style.st.css': {
                            content: `
                            .gaga{
                                |color:value($myColor$)|;
                            }
                            `
                        }
                    }
                }, [{ message: 'unknown var "myColor"', file: '/style.st.css' }]);
            });

            it('class cannot be used as var', () => {
                const config = {
                    entry: '/main.st.css',
                    files: {
                        '/main.st.css': {
                            content: `
                            :import{
                                -st-from:"./style.st.css";
                                -st-named:my-class;
                            }
                            .root{
                                |color:value($my-class$)|;
                            }
                          `
                        },
                        '/style.st.css': {
                            content: `
                                .my-class {}
                            `
                        }
                    }
                };
                expectWarningsFromTransform(config,
                    [{ message: 'class "my-class" cannot be used as a variable', file: '/main.st.css' }]);
            });

            it('stylesheet cannot be used as var', () => {
                const config = {
                    entry: '/main.st.css',
                    files: {
                        '/main.st.css': {
                            content: `
                            :import{
                                -st-from:"./file.st.css";
                                -st-default:Comp;
                            }
                            .root{
                                |color:value($Comp$)|;
                            }
                          `
                        },
                        '/file.st.css': {
                            content: ''
                        }
                    }
                };
                expectWarningsFromTransform(config,
                    [{ message: 'stylesheet "Comp" cannot be used as a variable', file: '/main.st.css' }]);
            });

            it('JS imports cannot be used as vars', () => {
                const config = {
                    entry: '/main.st.css',
                    files: {
                        '/main.st.css': {
                            content: `
                            :import{
                                -st-from:"./mixins";
                                -st-default:my-mixin;
                            }
                            .root{
                                |color:value($my-mixin$)|;
                            }
                          `
                        },
                        '/mixins.js': {
                            content: `module.exports = function myMixin() {};`
                        }
                    }
                };
                expectWarningsFromTransform(config,
                    [{ message: 'JavaScript import "my-mixin" cannot be used as a variable', file: '/main.st.css' }]);
            });

            it('should warn when encountering a cyclic dependecy in a var definition', () => {
                const config = {
                    entry: '/main.st.css',
                    files: {
                        '/main.st.css': {
                            content: `
                            :vars {
                                a: value(b);
                                b: value(c);
                                |c: value(a)|;
                            }
                            .root{
                                color: value(a);
                            }
                          `
                        }
                    }
                };
                const mainPath = resolve('/main.st.css');
                expectWarningsFromTransform(config,
                    [{ message: `Cyclic value definition detected: "→ ${mainPath}: a\n↪ ${mainPath}: b\n↪ ${mainPath}: c\n↻ ${mainPath}: a"`, file: '/main.st.css' }]); // tslint:disable-line:max-line-length
            });
        });

        describe('formatters', () => {
            it('should warn when trying to use a missing formatter', () => {
                const key = 'print';
                const config = {
                    entry: `/main.st.css`,
                    files: {
                        '/main.st.css': {
                            content: `
                            .container {
                                |border: $print$|();
                            }
                            `
                        }
                    }
                };

                expectWarningsFromTransform(config,
                    [{ message: `cannot find formatter: ${key}`, file: '/main.st.css' }]);
            });

            it('should warn a formatter throws an error', () => {
                const config = {
                    entry: `/main.st.css`,
                    files: {
                        '/main.st.css': {
                            content: `
                            :import {
                                -st-from: "./formatter";
                                -st-default: fail;
                            }
                            :vars {
                                param1: red;
                            }
                            .some-class {
                                |color: $fail(a, value(param1), c)$|;
                            }
                            `
                        },
                        '/formatter.js': {
                            content: `
                                module.exports = function fail() {
                                    throw new Error("FAIL FAIL FAIL");
                                }
                            `
                        }
                    }
                };

                expectWarningsFromTransform(config,
                    [{
                        message: `failed to execute formatter "fail(a, red, c)" with error: "FAIL FAIL FAIL"`,
                        file: '/main.st.css'
                    }]);
            });
        });

        describe('native', () => {
            Object.keys(nativeFunctionsDic).forEach(cssFunc => {
                it(`should not return a warning for native ${cssFunc} pseudo class`, () => {
                    const config: Config = {
                        entry: '/main.css',
                        files: {
                            '/main.css': {
                                content: `
                                .myClass {
                                    background: ${cssFunc}(a, b, c);
                                }`
                            }
                        }
                    };
                    expectWarningsFromTransform(config, []);
                });
            });
        });
    });
});
