import {
    expectWarnings,
    expectWarningsFromTransform,
    findTestLocations
} from '@stylable/core-test-kit';
import { expect } from 'chai';
import { functionWarnings, mixinWarnings, valueMapping } from '../src';
import { nativePseudoElements, reservedKeyFrames } from '../src/native-reserved-lists';
import { processorWarnings } from '../src/stylable-processor';
import { resolverWarnings } from '../src/stylable-resolver';
import { transformerWarnings } from '../src/stylable-transformer';
import { rootValueMapping, valueParserWarnings } from '../src/stylable-value-parsers';

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
                expectWarnings(
                    `
                    |Something| {

                    }
                `,
                    [{ message: '"Something" component is not imported', file: 'main.css' }]
                );
            });

            it('should return warning for unterminated "."', () => {
                expectWarnings(
                    `
                    .root{

                    }
                    .|
                `,
                    [{ message: 'identifier expected', file: 'main.css' }]
                );
            });
            it('should return warning for unterminated ":"', () => {
                expectWarnings(
                    `
                    .root{

                    }
                    :|
                `,
                    [{ message: 'identifier expected', file: 'main.css' }]
                );
            });
            it('should return warning for className without rule area', () => {
                expectWarnings(
                    `
                    .root{

                    }
                    .gaga|
                `,
                    [{ message: '{ expected', file: 'main.css' }]
                );
            });
        });
        xdescribe('ruleset', () => {
            it('should return warning for unterminated ruleset', () => {
                expectWarnings(
                    `
                    .root{

                    }
                    .gaga{
                        color:red|
                `,
                    [{ message: '; expected', file: 'main.css' }]
                );
            });
        });
        xdescribe('rules', () => {
            it('should return warning for unterminated rule', () => {
                expectWarnings(
                    `
                    .root{

                    }
                    .gaga{
                        color|
                    }
                `,
                    [{ message: ': expected', file: 'main.css' }]
                );
                expectWarnings(
                    `
                    .root{

                    }
                    .gaga{
                        color:|
                    }
                `,
                    [{ message: 'property value expected', file: 'main.css' }]
                );
                // todo: add cases for any unterminated selectors (direct descendant, etc...)
            });
            it('should return warning for unknown rule', () => {
                expectWarnings(
                    `
                    .root{
                        |hello|:yossi;
                    }
                `,
                    [{ message: 'unknown rule "hello"', file: 'main.css' }]
                );
            });

            it('should warn when using illegal characters', () => {
                expectWarnings(
                    `
                    <|{

                    }
                `,
                    [{ message: 'illegal character <', file: 'main.css' }]
                );
            });

            it('should return warning for unknown directive', () => {
                expectWarnings(
                    `
                    .gaga{
                        |-st-something|:true;
                    }
                `,
                    [{ message: 'unknown directive "-st-something"', file: 'main.css' }]
                );
            });
        });
        describe('pseudo selectors', () => {
            xit('should return warning for native pseudo elements without selector', () => {
                expectWarnings(
                    `
                    |::before|{

                    }
                `,
                    [
                        {
                            message:
                                'global pseudo elements are not allowed, you can use ".root::before" instead',
                            file: 'main.css'
                        }
                    ]
                );
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
                    expectWarningsFromTransform(config, [
                        {
                            message: transformerWarnings.UNKNOWN_PSEUDO_ELEMENT('myBtn'),
                            file: '/main.css'
                        }
                    ]);
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
                    expectWarningsFromTransform(config, []);
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
                    expectWarningsFromTransform(config, []);
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
                expectWarnings(
                    `
                    |.gaga .root|{}
                `,
                    [{ message: processorWarnings.ROOT_AFTER_SPACING(), file: 'main.css' }]
                );
            });

            it('should return warning for ".root" after global and local classes', () => {
                expectWarnings(
                    `
                    |:global(*) .x .root|{}
                `,
                    [{ message: processorWarnings.ROOT_AFTER_SPACING(), file: 'main.css' }]
                );
            });

            it('should return warning for ".root" after a global and element', () => {
                expectWarnings(
                    `
                    |:global(*) div .root|{}
                `,
                    [
                        { message: processorWarnings.UNSCOPED_ELEMENT('div'), file: 'main.css' },
                        { message: processorWarnings.ROOT_AFTER_SPACING(), file: 'main.css' }
                    ]
                );
            });

            it('should not return warning for ".root" after a global selector', () => {
                expectWarnings(
                    `
                    :global(*) .root{}
                `,
                    []
                );
            });

            it('should not return warning for ".root" after a complex global selector', () => {
                expectWarnings(
                    `
                    :global(body[dir="rtl"] > header) .root {}
                `,
                    []
                );
            });
        });

        describe('-st-mixin', () => {
            it('should return warning for unknown mixin', () => {
                expectWarnings(
                    `
                    .gaga{
                        |-st-mixin: $myMixin$|;
                    }
                `,
                    [{ message: processorWarnings.UNKNOWN_MIXIN('myMixin'), file: 'main.css' }]
                );
            });

            it('should return a warning for a CSS mixin using un-named params', () => {
                expectWarnings(
                    `
                    .mixed {
                        color: red;
                    }
                    .gaga{
                        |-st-mixin: mixed($1$)|;
                    }

                `,
                    [
                        {
                            message: valueParserWarnings.CSS_MIXIN_FORCE_NAMED_PARAMS(),
                            file: 'main.css'
                        }
                    ]
                );
            });

            it('should add error when attempting to mix in an unknown mixin symbol', () => {
                const config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: `
                            :import {
                                -st-from: "./imported.st.css";
                                -st-named: my-mixin;
                            }
                            .container {
                                |-st-mixin: $my-mixin$|;
                            }
                            `
                        },
                        '/imported.st.css': {
                            content: ``
                        }
                    }
                };

                expectWarningsFromTransform(config, [
                    {
                        message: resolverWarnings.UNKNOWN_IMPORTED_SYMBOL(
                            'my-mixin',
                            './imported.st.css'
                        ),
                        file: '/main.css',
                        skip: true,
                        skipLocationCheck: true
                    },
                    { message: mixinWarnings.UNKNOWN_MIXIN_SYMBOL('my-mixin'), file: '/main.css' }
                ]);
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
                const mainPath = '/main.css';
                const xPath = [`y from ${mainPath}`, `x from ${mainPath}`];
                const yPath = [`x from ${mainPath}`, `y from ${mainPath}`];
                expectWarningsFromTransform(config, [
                    {
                        message: mixinWarnings.CIRCULAR_MIXIN(xPath),
                        file: '/main.css',
                        skipLocationCheck: true
                    },
                    {
                        message: mixinWarnings.CIRCULAR_MIXIN(yPath),
                        file: '/main.css',
                        skipLocationCheck: true
                    }
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
                expectWarningsFromTransform(config, [
                    {
                        message: mixinWarnings.FAILED_TO_APPLY_MIXIN('bug in mixin'),
                        file: '/main.css'
                    }
                ]);
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

                expectWarningsFromTransform(config, [
                    { message: mixinWarnings.JS_MIXIN_NOT_A_FUNC(), file: '/main.css' }
                ]);
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
                expectWarningsFromTransform(config, [
                    { message: valueParserWarnings.VALUE_CANNOT_BE_STRING(), file: '/main.css' }
                ]);
            });

            it('should warn about non-existing variables in mixin overrides', () => {
                const config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: `
                            .mixed {}
                            .container {
                                |-st-mixin: mixed(arg value($missingVar$))|;
                            }
                            `
                        }
                    }
                };
                expectWarningsFromTransform(config, [
                    { message: functionWarnings.UNKNOWN_VAR('missingVar'), file: '/main.css' }
                ]);
            });

            it('should warn about non-existing variables in a multi-argument mixin override', () => {
                const config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: `
                            :vars {
                                color1: red;
                                color2: green;
                            }
                            .mixed {
                                color: value(color1);
                                background: value(color2);
                            }
                            .container {
                                |-st-mixin: mixed(color1 blue, color2 value($missingVar$))|;
                            }
                            `
                        }
                    }
                };
                expectWarningsFromTransform(config, [
                    { message: functionWarnings.UNKNOWN_VAR('missingVar'), file: '/main.css' }
                ]);
            });
        });

        describe(':vars', () => {
            it('should return warning when defined in a complex selector', () => {
                expectWarnings(
                    `
                |.gaga:vars|{
                    myColor:red;
                }

                `,

                    [
                        {
                            message: processorWarnings.FORBIDDEN_DEF_IN_COMPLEX_SELECTOR(
                                rootValueMapping.vars
                            ),
                            file: 'main.css'
                        }
                    ]
                );
            });
        });

        describe(':import', () => {
            it('should return warning when defined in a complex selector', () => {
                expectWarnings(
                    `
                    |.gaga:import|{
                        -st-from:"./file.st.css";
                        -st-default:Comp;
                    }
                `,
                    [
                        {
                            message: processorWarnings.FORBIDDEN_DEF_IN_COMPLEX_SELECTOR(':import'),
                            file: 'main.css'
                        }
                    ]
                );
            });

            it('should return warning when default import is defined with a lowercase first letter', () => {
                expectWarnings(
                    `
                    :import{
                        -st-from:"./file.st.css";
                        |-st-default: $comp$;|
                    }
                `,
                    [
                        {
                            message: processorWarnings.DEFAULT_IMPORT_IS_LOWER_CASE(),
                            file: 'main.css'
                        }
                    ]
                );
            });

            it('should return a warning for non import rules inside imports', () => {
                const config = {
                    entry: '/main.st.css',
                    files: {
                        '/main.st.css': {
                            content: `
                            :import{
                                -st-from:"./imported.st.css";
                                -st-default:Comp;
                                |$color$:red;|
                            }
                            `
                        },
                        '/imported.st.css': {
                            content: `
                            .root{
                                color: green;
                            }
                            `
                        }
                    }
                };
                expectWarningsFromTransform(config, [
                    {
                        message: processorWarnings.ILLEGAL_PROP_IN_IMPORT('color'),
                        file: '/main.st.css'
                    }
                ]);
            });

            it('should return a warning for import with missing "-st-from" declaration', () => {
                expectWarnings(
                    `
                    |:import{
                        -st-default:Comp;
                    }|
                `,
                    [
                        {
                            message: processorWarnings.FROM_PROP_MISSING_IN_IMPORT(),
                            file: 'main.st.css'
                        }
                    ]
                );
            });

            it('should return a warning for import with empty "-st-from" declaration', () => {
                expectWarnings(
                    `
                    :import{
                        |-st-from: "   ";|
                        -st-default: Comp;
                    }
                `,
                    [
                        {
                            severity: 'error',
                            message: processorWarnings.EMPTY_IMPORT_FROM(),
                            file: 'main.st.css'
                        }
                    ]
                );
            });

            it('should return a warning for multiple "-st-from" declarations', () => {
                expectWarnings(
                    `
                    |:import{
                        -st-from: "a";
                        -st-from: "b";
                        -st-default: Comp;
                    }|
                `,
                    [{ message: processorWarnings.MULTIPLE_FROM_IN_IMPORT(), file: 'main.st.css' }]
                );
            });
        });

        describe('-st-extends', () => {
            it('should return warning when defined under complex selector', () => {
                expectWarnings(
                    `
                    :import{
                        -st-from:"./file";
                        -st-default:Comp;
                    }
                    .root:hover{
                        |-st-extends|:Comp;
                    }
                `,
                    [
                        {
                            message: processorWarnings.FORBIDDEN_DEF_IN_COMPLEX_SELECTOR(
                                '-st-extends'
                            ),
                            file: 'main.css'
                        }
                    ]
                );
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
                expectWarningsFromTransform(config, [
                    { message: transformerWarnings.IMPORT_ISNT_EXTENDABLE(), file: '/main.st.css' }
                ]);
            });
            it('should warn if extends by js import', () => {
                const config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: `
                            :import {
                                -st-from: './imported.js';
                                -st-default: special;
                            }
                            .myclass {
                                |-st-extends: $special$|
                            }
                            `
                        },
                        '/imported.js': {
                            content: ``
                        }
                    }
                };
                expectWarningsFromTransform(config, [
                    { message: transformerWarnings.CANNOT_EXTEND_JS(), file: '/main.css' }
                ]);
            });
            it('should warn if named extends does not exist', () => {
                const config = {
                    entry: '/main.css',
                    files: {
                        '/main.css': {
                            content: `
                            :import {
                                -st-from: './file.st.css';
                                -st-named: special;
                            }
                            .myclass {
                                |-st-extends: $special$;|
                            }
                            `
                        },
                        '/file.st.css': {
                            content: ``
                        }
                    }
                };
                expectWarningsFromTransform(config, [
                    {
                        message: resolverWarnings.UNKNOWN_IMPORTED_SYMBOL(
                            'special',
                            './file.st.css'
                        ),
                        file: '/main.css',
                        skipLocationCheck: true
                    },
                    {
                        message: transformerWarnings.CANNOT_EXTEND_UNKNOWN_SYMBOL('special'),
                        file: '/main.css'
                    }
                ]);
            });
        });

        describe('override -st-* warnings', () => {
            it('should warn on typed class extend override', () => {
                expectWarnings(
                    `
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
                `,
                    [
                        {
                            message: processorWarnings.OVERRIDE_TYPED_RULE(
                                valueMapping.extends,
                                'root'
                            ),
                            file: 'main.css'
                        }
                    ]
                );
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
                    }
                }
            };
            expectWarningsFromTransform(config, [
                { message: processorWarnings.OVERRIDE_MIXIN(), file: '/main.css' }
            ]);
        });

        describe('from import', () => {
            it('should warn for unknown import', () => {
                const config = {
                    entry: '/main.st.css',
                    files: {
                        '/main.st.css': {
                            content: `
                            :import{
                                -st-from:"./import.st.css";
                                -st-named: shlomo, momo;
                            }
                            .myClass {
                                -st-extends: shlomo;
                            }
                            .myClass1 {
                                |-st-extends: $momo$;|
                            }
                          `
                        },
                        '/import.st.css': {
                            content: `
                                .shlomo {
                                    color: red
                                }
                            `
                        }
                    }
                };
                expectWarningsFromTransform(config, [
                    {
                        message: resolverWarnings.UNKNOWN_IMPORTED_SYMBOL(
                            'momo',
                            './import.st.css'
                        ),
                        file: '/main.st.css',
                        skip: true,
                        skipLocationCheck: true
                    },
                    {
                        message: transformerWarnings.CANNOT_EXTEND_UNKNOWN_SYMBOL('momo'),
                        file: '/main.st.css'
                    }
                ]);
            });

            it('should warn when import redeclare same symbol (in same block)', () => {
                expectWarnings(
                    `
                    |:import {
                        -st-from: './file.st.css';
                        -st-default: Name;
                        -st-named: $Name$;
                    }
                `,
                    [{ message: processorWarnings.REDECLARE_SYMBOL('Name'), file: 'main.st.css' }]
                );
            });

            it('should warn when import redeclare same symbol (in different block)', () => {
                expectWarnings(
                    `
                    :import {
                        -st-from: './file.st.css';
                        -st-default: Name;
                    }
                    |:import {
                        -st-from: './file.st.css';
                        -st-default: $Name$;
                    }
                `,
                    [{ message: processorWarnings.REDECLARE_SYMBOL('Name'), file: 'main.st.css' }]
                );
            });

            it('should warn when import redeclare same symbol (in different block types)', () => {
                expectWarnings(
                    `
                    :import {
                        -st-from: './file.st.css';
                        -st-default: Name;
                    }
                    :vars {
                        |$Name$: red;
                    }
                `,
                    [{ message: processorWarnings.REDECLARE_SYMBOL('Name'), file: 'main.st.css' }]
                );
            });
        });
    });

    describe('complex examples', () => {
        describe(':import', () => {
            it('should return warning for unknown var import', () => {
                const config = {
                    entry: '/main.st.css',
                    files: {
                        '/main.st.css': {
                            content: `
                            :import{
                                -st-from: "./file.st.css";
                                -st-named: myVar;
                            }
                            .root {
                                |color: value($myVar$);|
                            }`
                        },
                        '/file.st.css': {
                            content: `
                            :vars {
                                otherVar: someValue;
                            }
                            `
                        }
                    }
                };
                expectWarningsFromTransform(config, [
                    {
                        message: resolverWarnings.UNKNOWN_IMPORTED_SYMBOL('myVar', './file.st.css'),
                        file: '/main.st.css',
                        skip: true,
                        skipLocationCheck: true
                    },
                    {
                        message: functionWarnings.CANNOT_FIND_IMPORTED_VAR('myVar'),
                        file: '/main.st.css'
                    }
                ]);
            });
        });
    });

    describe('selectors', () => {
        // TODO2: next phase
        xit('should not allow conflicting extends', () => {
            expectWarnings(
                `
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
            `,
                [
                    {
                        message: 'conflicting extends matching same target [.my-a.my-b]',
                        file: 'main.css'
                    },
                    {
                        message: 'conflicting extends matching same target [SheetA.my-b]',
                        file: 'main.css'
                    },
                    {
                        message: 'conflicting extends matching same target [SheetB.my-a]',
                        file: 'main.css'
                    }
                ]
            );
        });

        describe('root scoping disabled', () => {
            it('should not warn when using native elements with root scoping', () => {
                expectWarnings(
                    `
                    .root button {}
                `,
                    []
                );
            });

            it('should not warn when using native elements after scoping', () => {
                expectWarnings(
                    `
                    .class {}
                    .class button {}
                `,
                    []
                );
            });

            it('should warn when using imported elements (classes) without scoping', () => {
                expectWarnings(
                    `
                    :import {
                        -st-from: "./blah.st.css";
                        -st-named: Blah;
                    }

                    |.$Blah$| {}
                `,
                    [{ message: processorWarnings.UNSCOPED_CLASS('Blah'), file: 'main.css' }]
                );
            });

            it('should not warn when using imported elements (classes) without scoping', () => {
                expectWarnings(
                    `
                    :import {
                        -st-from: "./blah.st.css";
                        -st-named: someClass;
                        -st-default: MyComp;
                    }
                    
                    @st-scope Theme {
                        .someClass {
                            background: black;
                        }
                    }

                `,
                    []
                );
            });

            it('should warn regardless if using a global before the element', () => {
                expectWarnings(
                    `
                    |:global(div) $button$| {}
                `,
                    [{ message: processorWarnings.UNSCOPED_ELEMENT('button'), file: 'main.css' }]
                );
            });

            it('should warn when using imported element with no root scoping', () => {
                expectWarnings(
                    `
                    :import {
                        -st-from: "./blah.st.css";
                        -st-default: Blah;
                    }

                    |$Blah$| {}
                `,
                    [{ message: processorWarnings.UNSCOPED_ELEMENT('Blah'), file: 'main.css' }]
                );
            });

            it('should warn when using native elements without scoping', () => {
                expectWarnings(
                    `
                    |$button$| {}
                `,
                    [{ message: processorWarnings.UNSCOPED_ELEMENT('button'), file: 'main.css' }]
                );
            });

            it('should warn when using imported elements (classes) without scoping', () => {
                expectWarnings(
                    `
                    :import {
                        -st-from: "./blah.st.css";
                        -st-named: blah;
                    }

                    |.$blah$| {}
                `,
                    [{ message: processorWarnings.UNSCOPED_CLASS('blah'), file: 'main.css' }]
                );
            });
        });
    });

    describe('transforms', () => {
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
                expectWarningsFromTransform(config, [
                    { message: transformerWarnings.KEYFRAME_NAME_RESERVED(key), file: '/main.css' }
                ]);
            });
        });

        it('should error on unresolved alias', () => {
            const config = {
                entry: '/main.st.css',
                files: {
                    '/main.st.css': {
                        namespace: 'entry',
                        content: `
                            :import{
                                -st-from: "./imported.st.css";
                                -st-default: Imported;
                                -st-named: inner-class;
                            }

                            .root .Imported{}
                            |.root .$inner-class$ {}|
                        `
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `.root{}`
                    }
                }
            };
            expectWarningsFromTransform(config, [
                {
                    message: resolverWarnings.UNKNOWN_IMPORTED_SYMBOL(
                        'inner-class',
                        './imported.st.css'
                    ),
                    file: '/main.st.css',
                    skip: true,
                    skipLocationCheck: true
                },
                {
                    message: transformerWarnings.UNKNOWN_IMPORT_ALIAS('inner-class'),
                    file: '/main.st.css'
                }
            ]);
        });

        describe('imports', () => {
            it('should error on unresolved file', () => {
                const config = {
                    entry: '/main.st.css',
                    files: {
                        '/main.st.css': {
                            namespace: 'entry',
                            content: `
                                :import{
                                    |-st-from: "$./missing.st.css$";|
                                }
                            `
                        }
                    }
                };
                expectWarningsFromTransform(config, [
                    {
                        message: resolverWarnings.UNKNOWN_IMPORTED_FILE('./missing.st.css'),
                        file: '/main.st.css'
                    }
                ]);
            });

            it('should error on unresolved file from third party', () => {
                const config = {
                    entry: '/main.st.css',
                    files: {
                        '/main.st.css': {
                            namespace: 'entry',
                            content: `
                                :import{
                                    |-st-from: "$missing-package/index.st.css$";|
                                }
                            `
                        }
                    }
                };
                expectWarningsFromTransform(
                    config,

                    [
                        {
                            message: resolverWarnings.UNKNOWN_IMPORTED_FILE(
                                'missing-package/index.st.css'
                            ),
                            file: '/main.st.css'
                        }
                    ]
                );
            });

            it('should error on unresolved named symbol', () => {
                const config = {
                    entry: '/main.st.css',
                    files: {
                        '/main.st.css': {
                            namespace: 'entry',
                            content: `
                                :import{
                                    -st-from: "./imported.st.css";
                                    |-st-named: $Missing$;|
                                }
                            `
                        },
                        '/imported.st.css': {
                            content: `.root{}`
                        }
                    }
                };
                expectWarningsFromTransform(
                    config,

                    [
                        {
                            message: resolverWarnings.UNKNOWN_IMPORTED_SYMBOL(
                                'Missing',
                                './imported.st.css'
                            ),
                            file: '/main.st.css'
                        }
                    ]
                );
            });

            it('should error on unresolved named symbol with alias', () => {
                const config = {
                    entry: '/main.st.css',
                    files: {
                        '/main.st.css': {
                            namespace: 'entry',
                            content: `
                                :import{
                                    -st-from: "./imported.st.css";
                                    |-st-named: $Missing$ as LocalMissing;|
                                }
                            `
                        },
                        '/imported.st.css': {
                            content: `.root{}`
                        }
                    }
                };
                expectWarningsFromTransform(
                    config,

                    [
                        {
                            message: resolverWarnings.UNKNOWN_IMPORTED_SYMBOL(
                                'Missing',
                                './imported.st.css'
                            ),
                            file: '/main.st.css'
                        }
                    ]
                );
            });
        });
    });
});
