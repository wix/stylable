import { expect } from 'chai';
import {
    diagnosticBankReportToStrings,
    expectAnalyzeDiagnostics,
    expectTransformDiagnostics,
    findTestLocations,
} from '@stylable/core-test-kit';
import {
    processorDiagnostics,
    transformerDiagnostics,
    nativePseudoElements,
} from '@stylable/core/dist/index-internal';
import { CSSClass, CSSType } from '@stylable/core/dist/features';
import { generalDiagnostics } from '@stylable/core/dist/features/diagnostics';

const cssTypeDiagnostics = diagnosticBankReportToStrings(CSSType.diagnostics);
const cssClassDiagnostics = diagnosticBankReportToStrings(CSSClass.diagnostics);
const transformerStringDiagnostics = diagnosticBankReportToStrings(transformerDiagnostics);
const processorStringDiagnostics = diagnosticBankReportToStrings(processorDiagnostics);
const generalStringDiagnostics = diagnosticBankReportToStrings(generalDiagnostics);

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
                        message: cssTypeDiagnostics.INVALID_FUNCTIONAL_SELECTOR(`#abc`, `id`),
                        file: `main.css`,
                    },
                ]);
            });
            it(`should return error for attribute`, () => {
                expectAnalyzeDiagnostics(`|.root $[attr]()$| {}`, [
                    {
                        severity: `error`,
                        message: cssTypeDiagnostics.INVALID_FUNCTIONAL_SELECTOR(
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
                        message: cssTypeDiagnostics.INVALID_FUNCTIONAL_SELECTOR(`&`, `nesting`),
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
                        entry: '/main.st.css',
                        files: {
                            '/main.st.css': {
                                content: `
                                |.root::$myBtn$|{

                                }`,
                            },
                        },
                    };
                    expectTransformDiagnostics(config, [
                        {
                            message: transformerStringDiagnostics.UNKNOWN_PSEUDO_ELEMENT('myBtn'),
                            file: '/main.st.css',
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
                                generalStringDiagnostics.FORBIDDEN_DEF_IN_COMPLEX_SELECTOR(
                                    '-st-extends'
                                ),
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
                            message: processorStringDiagnostics.OVERRIDE_TYPED_RULE(
                                `-st-extends`,
                                'root'
                            ),
                            file: 'main.css',
                        },
                    ]
                );
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
                    [
                        {
                            message: cssClassDiagnostics.UNSCOPED_CLASS('Blah'),
                            file: 'main.css',
                        },
                    ]
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
                            message: cssTypeDiagnostics.UNSCOPED_TYPE_SELECTOR('button'),
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
                            message: cssTypeDiagnostics.UNSCOPED_TYPE_SELECTOR('button'),
                            file: 'main.css',
                        },
                    ]
                );
            });
        });
    });
});
