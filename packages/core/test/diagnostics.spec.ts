import { expect } from 'chai';
import {
    expectAnalyzeDiagnostics,
    expectTransformDiagnostics,
    findTestLocations,
} from '@stylable/core-test-kit';
import {
    mixinWarnings,
    valueMapping,
    processorWarnings,
    transformerWarnings,
    nativePseudoElements,
    rootValueMapping,
    valueParserWarnings,
} from '@stylable/core';
import { STImport, CSSClass, CSSType, STSymbol, STVar } from '@stylable/core/dist/features';
import { generalDiagnostics } from '@stylable/core/dist/features/diagnostics';

describe('findTestLocations', () => {
    it('find single location 1', () => {
        const l = findTestLocations('\n  |a|');
        expect(l.start, 'start').to.eql({ line: 2, column: 3, offset: 3 });
        expect(l.end, 'end').to.eql({ line: 2, column: 4, offset: 5 });
    });

    it('find single location 2', () => {
        const l = findTestLocations('\n  |a\n  |');
        expect(l.start, 'start').to.eql({ line: 2, column: 3, offset: 3 });
        expect(l.end, 'end').to.eql({ line: 3, column: 3, offset: 8 });
    });

    it('find single location with word', () => {
        const l = findTestLocations('\n  |$a$\n  |');
        expect(l.start, 'start').to.eql({ line: 2, column: 3, offset: 3 });
        expect(l.end, 'end').to.eql({ line: 3, column: 3, offset: 10 });
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
                expectAnalyzeDiagnostics(
                    `
                    |Something| {

                    }
                `,
                    [{ message: '"Something" component is not imported', file: 'main.css' }]
                );
            });

            it('should return warning for unterminated "."', () => {
                expectAnalyzeDiagnostics(
                    `
                    .root{

                    }
                    .|
                `,
                    [{ message: 'identifier expected', file: 'main.css' }]
                );
            });
            it('should return warning for unterminated ":"', () => {
                expectAnalyzeDiagnostics(
                    `
                    .root{

                    }
                    :|
                `,
                    [{ message: 'identifier expected', file: 'main.css' }]
                );
            });
            it('should return warning for className without rule area', () => {
                expectAnalyzeDiagnostics(
                    `
                    .root{

                    }
                    .gaga|
                `,
                    [{ message: '{ expected', file: 'main.css' }]
                );
            });
        });
        describe(`non spec functional selectors`, () => {
            it(`should not return an error for value() under pseudo-class`, () => {
                expectAnalyzeDiagnostics(`|.root :cls($value(abc)$)| {}`, []);
            });
            it(`should return error for id`, () => {
                expectAnalyzeDiagnostics(`|.root $#abc()$| {}`, [
                    {
                        severity: `error`,
                        message: CSSType.diagnostics.INVALID_FUNCTIONAL_SELECTOR(`#abc`, `id`),
                        file: `main.css`,
                    },
                ]);
            });
            it(`should return error for attribute`, () => {
                expectAnalyzeDiagnostics(`|.root $[attr]()$| {}`, [
                    {
                        severity: `error`,
                        message: CSSType.diagnostics.INVALID_FUNCTIONAL_SELECTOR(
                            `[attr]`,
                            `attribute`
                        ),
                        file: `main.css`,
                    },
                ]);
            });
            it(`should return error for nesting`, () => {
                expectAnalyzeDiagnostics(`|.root $&()$| {}`, [
                    {
                        severity: `error`,
                        message: CSSType.diagnostics.INVALID_FUNCTIONAL_SELECTOR(`&`, `nesting`),
                        file: `main.css`,
                    },
                ]);
            });
        });
        xdescribe('ruleset', () => {
            it('should return warning for unterminated ruleset', () => {
                expectAnalyzeDiagnostics(
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
                expectAnalyzeDiagnostics(
                    `
                    .root{

                    }
                    .gaga{
                        color|
                    }
                `,
                    [{ message: ': expected', file: 'main.css' }]
                );
                expectAnalyzeDiagnostics(
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
                expectAnalyzeDiagnostics(
                    `
                    .root{
                        |hello|:yossi;
                    }
                `,
                    [{ message: 'unknown rule "hello"', file: 'main.css' }]
                );
            });

            it('should warn when using illegal characters', () => {
                expectAnalyzeDiagnostics(
                    `
                    <|{

                    }
                `,
                    [{ message: 'illegal character <', file: 'main.css' }]
                );
            });

            it('should return warning for unknown directive', () => {
                expectAnalyzeDiagnostics(
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
                expectAnalyzeDiagnostics(
                    `
                    |::before|{

                    }
                `,
                    [
                        {
                            message:
                                'global pseudo elements are not allowed, you can use ".root::before" instead',
                            file: 'main.css',
                        },
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

                                }`,
                            },
                        },
                    };
                    expectTransformDiagnostics(config, [
                        {
                            message: transformerWarnings.UNKNOWN_PSEUDO_ELEMENT('myBtn'),
                            file: '/main.css',
                        },
                    ]);
                });
                it('should not warn on vendor prefixed pseudo element', () => {
                    const config = {
                        entry: '/main.css',
                        files: {
                            '/main.css': {
                                content: `
                                .root::-webkit-element{

                                }`,
                            },
                        },
                    };
                    expectTransformDiagnostics(config, []);
                });
                it('should not warn on vendor prefixed pseudo class', () => {
                    const config = {
                        entry: '/main.css',
                        files: {
                            '/main.css': {
                                content: `
                                .root:-webkit-hover{

                                }`,
                            },
                        },
                    };
                    expectTransformDiagnostics(config, []);
                });
                nativePseudoElements.forEach((nativeElement) => {
                    it(`should not return a warning for native ${nativeElement} pseudo element`, () => {
                        const selector = `|.root::$${nativeElement}$|{`;
                        const config = {
                            entry: '/main.css',
                            files: {
                                '/main.css': {
                                    content: `
                                    ${selector}
                                    }`,
                                },
                            },
                        };
                        expectTransformDiagnostics(config, []);
                    });
                });
            });
        });
    });

    describe('structure', () => {
        describe('root', () => {
            it('should return warning for ".root" after a selector', () => {
                expectAnalyzeDiagnostics(
                    `
                    |.gaga .root|{}
                `,
                    [{ message: processorWarnings.ROOT_AFTER_SPACING(), file: 'main.css' }]
                );
            });

            it('should return warning for ".root" after global and local classes', () => {
                expectAnalyzeDiagnostics(
                    `
                    |:global(*) .x .root|{}
                `,
                    [{ message: processorWarnings.ROOT_AFTER_SPACING(), file: 'main.css' }]
                );
            });

            it('should return warning for ".root" after a global and element', () => {
                expectAnalyzeDiagnostics(
                    `
                    |:global(*) div .root|{}
                `,
                    [
                        {
                            message: CSSType.diagnostics.UNSCOPED_TYPE_SELECTOR('div'),
                            file: 'main.css',
                        },
                        { message: processorWarnings.ROOT_AFTER_SPACING(), file: 'main.css' },
                    ]
                );
            });

            it('should not return warning for ".root" after a global selector', () => {
                expectAnalyzeDiagnostics(
                    `
                    :global(*) .root{}
                `,
                    []
                );
            });

            it('should not return warning for ".root" after a complex global selector', () => {
                expectAnalyzeDiagnostics(
                    `
                    :global(body[dir="rtl"] > header) .root {}
                `,
                    []
                );
            });
        });

        describe('-st-mixin', () => {
            it('should return warning for unknown mixin', () => {
                expectAnalyzeDiagnostics(
                    `
                    .gaga{
                        |-st-mixin: $myMixin$|;
                    }
                `,
                    [{ message: processorWarnings.UNKNOWN_MIXIN('myMixin'), file: 'main.css' }]
                );
            });

            it('should return a warning for a CSS mixin using un-named params', () => {
                expectTransformDiagnostics(
                    {
                        entry: '/style.st.css',
                        files: {
                            '/style.st.css': {
                                content: `
                                .mixed {
                                    color: red;
                                }
                                .gaga{
                                    |-st-mixin: mixed($1$)|;
                                }
            
                            `,
                            },
                        },
                    },
                    [
                        {
                            message: valueParserWarnings.CSS_MIXIN_FORCE_NAMED_PARAMS(),
                            file: '/style.st.css',
                        },
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
                            `,
                        },
                        '/imported.st.css': {
                            content: ``,
                        },
                    },
                };

                expectTransformDiagnostics(config, [
                    {
                        message: STImport.diagnostics.UNKNOWN_IMPORTED_SYMBOL(
                            'my-mixin',
                            './imported.st.css'
                        ),
                        file: '/main.css',
                        skip: true,
                        skipLocationCheck: true,
                    },
                    { message: mixinWarnings.UNKNOWN_MIXIN_SYMBOL('my-mixin'), file: '/main.css' },
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
                            `,
                        },
                    },
                };
                const mainPath = '/main.css';
                const xPath = [`y from ${mainPath}`, `x from ${mainPath}`];
                const yPath = [`x from ${mainPath}`, `y from ${mainPath}`];
                expectTransformDiagnostics(config, [
                    {
                        message: mixinWarnings.CIRCULAR_MIXIN(xPath),
                        file: '/main.css',
                        skipLocationCheck: true,
                    },
                    {
                        message: mixinWarnings.CIRCULAR_MIXIN(yPath),
                        file: '/main.css',
                        skipLocationCheck: true,
                    },
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
                            `,
                        },
                        '/imported.js': {
                            content: `
                                module.exports = function(){
                                    throw 'bug in mixin'
                                }
                            `,
                        },
                    },
                };
                expectTransformDiagnostics(config, [
                    {
                        message: mixinWarnings.FAILED_TO_APPLY_MIXIN('bug in mixin'),
                        file: '/main.css',
                    },
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
                            `,
                        },
                        '/imported.js': {
                            content: `

                            `,
                        },
                    },
                };

                expectTransformDiagnostics(config, [
                    { message: mixinWarnings.JS_MIXIN_NOT_A_FUNC(), file: '/main.css' },
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
                            `,
                        },
                        '/imported.js': {
                            content: ``,
                        },
                    },
                };
                expectTransformDiagnostics(config, [
                    { message: valueParserWarnings.VALUE_CANNOT_BE_STRING(), file: '/main.css' },
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
                            `,
                        },
                    },
                };
                expectTransformDiagnostics(config, [
                    { message: STVar.diagnostics.UNKNOWN_VAR('missingVar'), file: '/main.css' },
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
                            `,
                        },
                    },
                };
                expectTransformDiagnostics(config, [
                    { message: STVar.diagnostics.UNKNOWN_VAR('missingVar'), file: '/main.css' },
                ]);
            });
        });

        describe(':vars', () => {
            it('should return warning when defined in a complex selector', () => {
                expectAnalyzeDiagnostics(
                    `
                |.gaga:vars|{
                    myColor:red;
                }

                `,

                    [
                        {
                            message: generalDiagnostics.FORBIDDEN_DEF_IN_COMPLEX_SELECTOR(
                                rootValueMapping.vars
                            ),
                            file: 'main.css',
                        },
                    ]
                );
            });
        });

        describe('-st-extends', () => {
            it('should return warning when defined under complex selector', () => {
                expectAnalyzeDiagnostics(
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
                            message:
                                generalDiagnostics.FORBIDDEN_DEF_IN_COMPLEX_SELECTOR('-st-extends'),
                            file: 'main.css',
                        },
                    ]
                );
            });
        });

        describe('override -st-* warnings', () => {
            it('should warn on typed class extend override', () => {
                expectAnalyzeDiagnostics(
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
                            file: 'main.css',
                        },
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
                      `,
                    },
                },
            };
            expectTransformDiagnostics(config, [
                { message: processorWarnings.OVERRIDE_MIXIN('-st-mixin'), file: '/main.css' },
            ]);
        });

        describe('from import', () => {
            it('should warn when import redeclare same symbol (in different block types)', () => {
                expectAnalyzeDiagnostics(
                    `
                    |:import {
                        -st-from: './file.st.css';
                        -st-default: $Name$;
                    }|
                    :vars {
                        Name: red;
                    }
                `,
                    [
                        {
                            message: STSymbol.diagnostics.REDECLARE_SYMBOL('Name'),
                            file: 'main.st.css',
                        },
                        {
                            message: STSymbol.diagnostics.REDECLARE_SYMBOL('Name'),
                            file: 'main.st.css',
                            skipLocationCheck: true,
                        },
                    ]
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
                            }`,
                        },
                        '/file.st.css': {
                            content: `
                            :vars {
                                otherVar: someValue;
                            }
                            `,
                        },
                    },
                };
                expectTransformDiagnostics(config, [
                    {
                        message: STImport.diagnostics.UNKNOWN_IMPORTED_SYMBOL(
                            'myVar',
                            './file.st.css'
                        ),
                        file: '/main.st.css',
                        skip: true,
                        skipLocationCheck: true,
                    },
                    {
                        message: STVar.diagnostics.CANNOT_FIND_IMPORTED_VAR('myVar'),
                        file: '/main.st.css',
                    },
                ]);
            });
        });
    });

    describe('selectors', () => {
        // TODO2: next phase
        xit('should not allow conflicting extends', () => {
            expectAnalyzeDiagnostics(
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
                        file: 'main.css',
                    },
                    {
                        message: 'conflicting extends matching same target [SheetA.my-b]',
                        file: 'main.css',
                    },
                    {
                        message: 'conflicting extends matching same target [SheetB.my-a]',
                        file: 'main.css',
                    },
                ]
            );
        });

        describe('root scoping disabled', () => {
            it('should not warn when using native elements with root scoping', () => {
                expectAnalyzeDiagnostics(
                    `
                    .root button {}
                `,
                    []
                );
            });

            it('should not warn when using native elements after scoping', () => {
                expectAnalyzeDiagnostics(
                    `
                    .class {}
                    .class button {}
                `,
                    []
                );
            });

            it('should warn when using imported elements (classes) without scoping', () => {
                expectAnalyzeDiagnostics(
                    `
                    :import {
                        -st-from: "./blah.st.css";
                        -st-named: Blah;
                    }

                    |.$Blah$| {}
                `,
                    [{ message: CSSClass.diagnostics.UNSCOPED_CLASS('Blah'), file: 'main.css' }]
                );
            });

            it('should not issue scoping diagnostics for a class scoped by a selector with ":not()" (regression)', () => {
                expectAnalyzeDiagnostics(
                    `
                    :import {
                        -st-from: "./blah.st.css";
                        -st-named: classNeedsScoping;
                    }
                    .cls {
                        -st-states: someState;
                    }

                    .cls:not(:someState) .classNeedsScoping {}  
                `,
                    []
                );
            });

            it('should not warn when using imported elements (classes) without scoping', () => {
                expectAnalyzeDiagnostics(
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
                expectAnalyzeDiagnostics(
                    `
                    |:global(div) $button$| {}
                `,
                    [
                        {
                            message: CSSType.diagnostics.UNSCOPED_TYPE_SELECTOR('button'),
                            file: 'main.css',
                        },
                    ]
                );
            });

            it('should warn with multiple selector', () => {
                expectAnalyzeDiagnostics(
                    `
                    |.x, $button$| {}
                `,
                    [
                        {
                            message: CSSType.diagnostics.UNSCOPED_TYPE_SELECTOR('button'),
                            file: 'main.css',
                        },
                    ]
                );
            });
        });
    });
});
