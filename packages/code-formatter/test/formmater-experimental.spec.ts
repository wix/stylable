import { expect } from 'chai';
import { deindent } from '@stylable/core-test-kit';
import * as codeFormatter from '@stylable/code-formatter';

const { formatCSS } = codeFormatter;
function testFormatCss(config: {
    source: string;
    expect: string;
    message?: string;
    deindent?: boolean;
    skipReformat?: boolean;
    /* just to have an easy way of seeing 50 chars in expectation */
    X?: '|-------------------------------------80---------------------------------------|';
}) {
    const input = config.deindent ? deindent(config.source) : config.source;
    const preservedIntendedLastLine = config.expect.match(/\n\s*\n\s*$/) ? '\n' : '';
    const expected = config.deindent
        ? deindent(config.expect) + preservedIntendedLastLine
        : config.expect;

    const actual = formatCSS(input);

    expect(actual, config.message).to.eql(expected);
    // check reformat - shouldn't change
    if (!config.skipReformat) {
        const reformatMessage = 're-format' + (config.message ? ' ' + config.message : '');
        expect(formatCSS(actual), reformatMessage).to.eql(actual);
    }
}
describe('formatter - experimental', () => {
    describe('top level', () => {
        it('should preserve empty input', () => {
            testFormatCss({
                source: '',
                expect: '',
            });
        });
        it('should add new line at the end for any content', () => {
            testFormatCss({
                source: ' ',
                expect: ' \n',
            });
        });
        it('should pickup newline type from content and use on added newlines', () => {
            testFormatCss({
                source: '/*comment line 1\r\nline 2*/',
                expect: '/*comment line 1\r\nline 2*/\r\n',
            });
        });
        it('should set one line between each node', () => {
            testFormatCss({
                source: '.root {}\n\n\n.root {}',
                expect: '.root {}\n\n.root {}\n',
            });
            testFormatCss({
                source: '.root {}\n\n.root {}',
                expect: '.root {}\n\n.root {}\n',
            });
            testFormatCss({
                source: '.root {}\n.root {}',
                expect: '.root {}\n\n.root {}\n',
            });
            testFormatCss({
                source: '.root {}.root {}',
                expect: '.root {}\n\n.root {}\n',
            });
            testFormatCss({
                source: '.root {}@media {}',
                expect: '.root {}\n\n@media {}\n',
            });
            testFormatCss({
                source: '.root {}/*COMMENT*/',
                expect: '.root {}\n\n/*COMMENT*/\n',
            });
            testFormatCss({
                source: '@media {.root {}/*COMMENT*/}',
                expect: '@media {\n    .root {}\n\n    /*COMMENT*/\n}\n',
            });
        });
        it('should keep comment no line separation after comment', () => {
            // ToDo(discuss): maybe user intent should be preserved
            testFormatCss({
                source: '/*COMMENT*/.root {}',
                expect: '/*COMMENT*/\n.root {}\n',
            });
            testFormatCss({
                source: '/*COMMENT*/\n\n\n.root {}',
                expect: '/*COMMENT*/\n.root {}\n',
            });
        });
        it('should not format between comments', () => {
            testFormatCss({
                source: '/*COMMENT*//*COMMENT*/',
                expect: '/*COMMENT*//*COMMENT*/\n',
            });
            testFormatCss({
                source: '/*COMMENT*/\n/*COMMENT*/',
                expect: '/*COMMENT*/\n/*COMMENT*/\n',
            });
            testFormatCss({
                source: '/*COMMENT*/\n\n/*COMMENT*/',
                expect: '/*COMMENT*/\n\n/*COMMENT*/\n',
            });
        });
        it('should remove initial selector spaces (top level rule)', () => {
            testFormatCss({
                source: '   .root {}\n',
                expect: '.root {}\n',
            });
        });
    });
    describe('rule', () => {
        it('should set one space between selector and open block', () => {
            testFormatCss({
                source: '.root{}\n',
                expect: '.root {}\n',
            });
            testFormatCss({
                source: '.root\n\n\n{}\n',
                expect: '.root {}\n',
            });
            testFormatCss({
                source: '.root\r\n\r\n\r\n{}\n',
                expect: '.root {}\n',
            });
        });
        it('should close empty rule immediately (no whitespace)', () => {
            testFormatCss({
                source: '.root {   }\n',
                expect: '.root {}\n',
            });
            testFormatCss({
                source: '.root {\n\n\n}\n',
                expect: '.root {}\n',
            });
        });
        it('should minimize whitespace of comments after selector', () => {
            // ToDo(discuss): maybe user intent should be preserved (maybe just for newlines?)
            testFormatCss({
                source: '.root/*  */{}\n',
                expect: '.root /*  */ {}\n',
            });
            testFormatCss({
                source: '.root /*  */ {}\n',
                expect: '.root /*  */ {}\n',
            });
            testFormatCss({
                source: '.root   /*  */   {}\n',
                expect: '.root /*  */ {}\n',
            });
            testFormatCss({
                source: '.root   /*  */ /*  */  /*  */   {}\n',
                expect: '.root /*  */ /*  */ /*  */ {}\n',
            });
            testFormatCss({
                source: '.root   /*  */\n/*  */\n/*  */   {}\n',
                expect: '.root /*  */ /*  */ /*  */ {}\n',
            });
            testFormatCss({
                source: '.root   /*  */\r\n/*  */\r\n/*  */   {}\n',
                expect: '.root /*  */ /*  */ /*  */ {}\n',
            });
        });
        it('should space multiple selectors with one comma and space', () => {
            testFormatCss({
                source: 'h1,h2{}\n',
                expect: 'h1, h2 {}\n',
            });
        });
        it('should sort selectors by length (short to long)', () => {
            // ToDo: make this optional by flag
            testFormatCss({
                source: 'ccc,bb,a{}\n',
                expect: 'a, bb, ccc {}\n',
            });
        });
        it('should add new line between long selector', () => {
            testFormatCss({
                source: 'yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy,xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx{}\n',
                expect: 'yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy,\nxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx {}\n',
            });
        });
        it('format groups that contains same amount of newlines should stay grouped', () => {
            // ToDo(discuss): what is the intent here? - test title is unclear
            testFormatCss({
                deindent: true,
                source: ':global(html), :global(body), :global(div), :global(span), :global(applet), :global(object), :global(iframe), :global(h1), :global(h2), :global(h3), :global(h4), :global(h5), :global(h6), :global(p), :global(blockquote), :global(pre), :global(a), :global(abbr), :global(acronym), :global(address), :global(big), :global(cite), :global(code), :global(del), :global(dfn), :global(em), :global(img), :global(ins), :global(kbd), :global(q), :global(s), :global(samp), :global(small), :global(strike), :global(strong), :global(sub), :global(sup), :global(tt), :global(var), :global(b), :global(u), :global(i), :global(center), :global(dl), :global(dt), :global(dd), :global(ol), :global(ul), :global(li), :global(fieldset), :global(form), :global(label), :global(legend), :global(table), :global(caption), :global(tbody), :global(tfoot), :global(thead), :global(tr), :global(th), :global(td), :global(article), :global(aside), :global(canvas), :global(details), :global(embed), :global(figure), :global(figcaption), :global(footer), :global(header), :global(hgroup), :global(menu), :global(nav), :global(output), :global(ruby), :global(section), :global(summary), :global(time), :global(mark), :global(audio), :global(video) {}',
                X: '|-------------------------------------80---------------------------------------|',
                expect: `
                    :global(p), :global(a), :global(q), :global(s), :global(b),
                    :global(u), :global(i), :global(h1), :global(h2), :global(h3),
                    :global(h4), :global(h5), :global(h6), :global(em), :global(tt),
                    :global(dl), :global(dt), :global(dd), :global(ol), :global(ul),
                    :global(li), :global(tr), :global(th), :global(td), :global(div),
                    :global(pre), :global(big), :global(del), :global(dfn), :global(img),
                    :global(ins), :global(kbd), :global(sub), :global(sup), :global(var),
                    :global(nav), :global(html), :global(body), :global(span),
                    :global(abbr), :global(cite), :global(code), :global(samp),
                    :global(form), :global(menu), :global(ruby), :global(time),
                    :global(mark), :global(small), :global(label), :global(table),
                    :global(tbody), :global(tfoot), :global(thead), :global(aside),
                    :global(embed), :global(audio), :global(video), :global(applet),
                    :global(object), :global(iframe), :global(strike), :global(strong),
                    :global(center), :global(legend), :global(canvas), :global(figure),
                    :global(footer), :global(header), :global(hgroup), :global(output),
                    :global(acronym), :global(address), :global(caption), :global(article),
                    :global(details), :global(section), :global(summary), :global(fieldset),
                    :global(blockquote), :global(figcaption) {}
                    
                `,
            });
        });
        it('should sort and group selectors into separate lines in order to not reach max length', () => {
            // ToDo: check why first line is longer then 50
            testFormatCss({
                deindent: true,
                source: 'x,xx,xxx,xxxx,xxxxx,xxxxxx,xxxxxxx,xxxxxxxx,xxxxxxxxx,xxxxxxxxxx,xxxxxxxxxxx,xxxxxxxxxxxx,xxxxxxxxxxxxx,xxxxxxxxxxxxxx,xxxxxxxxxxxxxxx,xxxxxxxxxxxxxxxx {   }\n',
                X: '|-------------------------------------80---------------------------------------|',
                expect: `
                    x, xx, xxx, xxxx, xxxxx, xxxxxx, xxxxxxx, xxxxxxxx, xxxxxxxxx, xxxxxxxxxx,
                    xxxxxxxxxxx, xxxxxxxxxxxx, xxxxxxxxxxxxx, xxxxxxxxxxxxxx,
                    xxxxxxxxxxxxxxx, xxxxxxxxxxxxxxxx {}
                    
                `,
            });
        });
        it('selectors that included newline should preserve the newline', () => {
            testFormatCss({
                deindent: true,
                source: `
                    .root,
                    .part {}
                    
                `,
                expect: `
                    .root,
                    .part {}
                    
                `,
            });
        });
        it('should break declarations into separate lines and indent them accordingly', () => {
            testFormatCss({
                deindent: true,
                source: `.root {color: red; background: green;}`,
                expect: `
                    .root {
                        color: red;
                        background: green;
                    }
                    
                `,
            });
        });
        it('should remove newlines between declarations', () => {
            testFormatCss({
                deindent: true,
                source: `
                    .root {
                        color: red;
                        
                        background: green;


                        border: 1px solid blue;
                    }
                `,
                expect: `
                    .root {
                        color: red;
                        background: green;
                        border: 1px solid blue;
                    }
                    
                `,
            });
        });
    });
    describe('declaration', () => {
        it('should add semicolon to last declaration', () => {
            testFormatCss({
                deindent: true,
                source: `
                    .root {
                        color: red
                    }

                    .with-comment {
                        color: red/*!*/
                    }
                `,
                expect: `
                    .root {
                        color: red;
                    }

                    .with-comment {
                        color: red;/*!*/
                    }

                `,
            });
        });
        it('should set space after colon', () => {
            testFormatCss({
                deindent: true,
                source: `
                    .root {
                        color:red;
                        color:   green;
                        color:


                        blue;
                    }
                `,
                expect: `
                    .root {
                        color: red;
                        color: green;
                        color: blue;
                    }

                `,
            });
        });
        it('should set no space before colon', () => {
            testFormatCss({
                deindent: true,
                source: `
                    .root {
                        color : red;
                        color   : green;
                        color
                        
                        
                        : blue;
                    }
                `,
                expect: `
                    .root {
                        color: red;
                        color: green;
                        color: blue;
                    }

                `,
            });
        });
        it('should remove any whitespace before closing semicolon', () => {
            testFormatCss({
                deindent: true,
                source: `
                    .root {
                        color: red ;
                        color: green   ;
                        color: blue
                        
                        
                        ;
                    }
                `,
                expect: `
                    .root {
                        color: red;
                        color: green;
                        color: blue;
                    }

                `,
            });
        });
        it('should preserve whitespace inside strings', () => {
            testFormatCss({
                deindent: true,
                source: '.root {content: "   \t   ";}',
                expect: `
                    .root {
                        content: "   \t   ";
                    }
                    
                `,
            });
        });
        describe('custom properties', () => {
            it('should reduce value whitespace', () => {
                // ToDo: check if whitespace between custom value should be preserved as-is
                testFormatCss({
                    deindent: true,
                    source: `
                        .root {
                            --x:red   1;
                            --x:   green   2   ;
                            --x:
        
        
                            blue   3
                            
                            
                            ;
                        }
                    `,
                    expect: `
                        .root {
                            --x:red 1;
                            --x: green 2;
                            --x: blue 3;
                        }
        
                    `,
                });
            });
            it('should preserve empty value', () => {
                testFormatCss({
                    deindent: true,
                    source: '.root {--x:;}',
                    expect: `
                        .root {
                            --x:;
                        }
                        
                    `,
                });
            });
            it('should preserve comments', () => {
                testFormatCss({
                    deindent: true,
                    source: `
                        .root {
                            --x/*a*/:/*b*/1;
                            --y /*c*/ :   /*d*/   ;
                        }
                    `,
                    expect: `
                        .root {
                            --x/*a*/:/*b*/1;
                            --y/*c*/: /*d*/;
                        }
                        
                    `,
                });
            });
            it('should reduce any whitespace after value until rule-end to a single whitespace', () => {
                testFormatCss({
                    deindent: true,
                    source: `
                        .root {
                            --x: 1   
                            

                        }
                        .root {
                            --y:    
                            

                        }
                    `,
                    expect: `
                        .root {
                            --x: 1;
                        }

                        .root {
                            --y: ;
                        }

                    `,
                });
            });
            it('should reduce any whitespace after value until rule-end to a single whitespace (comment at end)', () => {
                testFormatCss({
                    deindent: true,
                    source: `
                        .root {
                            --a: /*a*/}
                        .root {
                            --b:/*b*/ }
                        .root {
                            --c:/*c*/  \t  }
                    `,
                    expect: `
                        .root {
                            --a: /*a*/;
                        }
                        
                        .root {
                            --b:/*b*/;
                        }
                        
                        .root {
                            --c:/*c*/;
                        }

                    `,
                });
            });
            it('should indent just like any other property', () => {
                testFormatCss({
                    deindent: true,
                    source: `.root {--x    : "a" 1 2 "b";}`,
                    expect: `
                        .root {
                            --x: "a" 1 2 "b";
                        }
        
                    `,
                });
            });
        });
        it('should separate inline top level comma separated values below "wrapLineLength"', () => {
            testFormatCss({
                deindent: true,
                source: `
                    .root {
                        font-family: A,B,C;
                        font-family: D, E, F;
                        font-family: G,   H   ,   I;
                    }
                `,
                expect: `
                    .root {
                        font-family: A, B, C;
                        font-family: D, E, F;
                        font-family: G, H, I;
                    }

                `,
            });
        });
        it('should wrap long top level comma separated values according to "wrapLineLength"', () => {
            testFormatCss({
                deindent: true,
                source: `
                    .root {
                        prop1: ${'A'.repeat(69)},${'B'.repeat(69)},${'C'.repeat(69)};

                        prop2:  \t  ${'D'.repeat(69)},${'E'.repeat(69)},${'F'.repeat(69)};
                    }
                `,
                X: '|-------------------------------------80---------------------------------------|',
                expect: `
                    .root {
                        prop1: ${'A'.repeat(69)},
                               ${'B'.repeat(69)},
                               ${'C'.repeat(69)};
                        prop2: ${'D'.repeat(69)},
                               ${'E'.repeat(69)},
                               ${'F'.repeat(69)};
                    }

                `,
            });
        });
        it('should only wrap once "wrapLineLength" is reached (mix)', () => {
            testFormatCss({
                deindent: true,
                source: `
                    .root {
                        prop1: 1,2,3,${'A'.repeat(80)},${'B'.repeat(80)},${'C'.repeat(80)},4,5,6;
                    }
                `,
                X: '|-------------------------------------80---------------------------------------|',
                expect: `
                    .root {
                        prop1: 1, 2, 3,
                               ${'A'.repeat(80)},
                               ${'B'.repeat(80)},
                               ${'C'.repeat(80)},
                               4, 5, 6;
                    }

                `,
            });
        });
        it('should only wrap once "wrapLineLength" is reached (mix with no commas)', () => {
            testFormatCss({
                deindent: true,
                source: `
                    .root {
                        pppppppp: xxxx/${'a'.repeat(80)}/yyyy/${'b'.repeat(80)};
                    }
                `,
                X: '|-------------------------------------80---------------------------------------|',
                expect: `
                    .root {
                        pppppppp: xxxx/
                                  ${'a'.repeat(80)}
                                  /yyyy/
                                  ${'b'.repeat(80)};
                    }
                    
                `,
            });
        });
        it('should respect newlines for value starting in a line after the prop and indent between wrapping value groups', () => {
            testFormatCss({
                deindent: true,
                source: `
                    .root {
                        prop1: 
                        AAA,
                                BBB, CCC,
                        DDD;

                        box-shadow:
                        0px
                                0px
                        0px
                                black, 1px
                        1px
                                1px
                        black;
                    }
                `,
                expect: `
                    .root {
                        prop1:
                            AAA,
                            BBB, CCC,
                            DDD;
                        box-shadow:
                            0px
                            0px
                            0px
                            black, 1px
                            1px
                            1px
                            black;
                    }

                `,
            });
        });
        it('should respect grid-template(-areas) newlines in any case', () => {
            testFormatCss({
                deindent: true,
                source: `
                    .root {
                        grid-template-areas:
                        "A B"
                        "C D";
                        grid-template-areas: "E F" 
                        "G H";
                        grid-template:
                        "I J" 40px / 1fr 1fr 1fr
                        "K L" 50%;
                        grid-template: "M N" 6ch
                        "O P" 5em / 20% 30px;
                    }
                `,
                expect: `
                    .root {
                        grid-template-areas:
                            "A B"
                            "C D";
                        grid-template-areas: "E F"
                                             "G H";
                        grid-template:
                            "I J" 40px / 1fr 1fr 1fr
                            "K L" 50%;
                        grid-template: "M N" 6ch
                                       "O P" 5em / 20% 30px;
                    }

                `,
            });
        });
        it('should preserve comments in values', () => {
            testFormatCss({
                deindent: true,
                source: `
                    .root {
                        left: calc(1em * 1.414 /* ~sqrt(2) */);
                        color: /*!*/ red;
                        background: /*!*/ red;
                    }
                `,
                expect: `
                    .root {
                        left: calc(1em * 1.414 /* ~sqrt(2) */);
                        color: /*!*/red;
                        background: /*!*/red;
                    }

                `,
            });
        });
        it('should align values to the same line when length is shorter then maximum', () => {
            testFormatCss({
                deindent: true,
                source: `
                    .root {
                        border: 1px
                    solid
                    red;
                        box-shadow:0px
                    0px
                    0px
                    black, 1px
                    1px
                    1px
                    black;
                    }
                `,
                expect: `
                    .root {
                        border: 1px solid red;
                        box-shadow: 0px 0px 0px black, 1px 1px 1px black;
                    }
                    
                `,
            });
        });
        it('should prefer to wrap at current line previous comma', () => {
            testFormatCss({
                deindent: true,
                source: `
                    @st-scope LightTheme {
                        Dialog::container {
                            box-shadow: aaaaa bbbbb cccccccccccccccccccc, ddddd eeee ffffffffffffffffffffff;
                        }
                    }
                `,
                X: '|-------------------------------------80---------------------------------------|',
                expect: `
                    @st-scope LightTheme {
                        Dialog::container {
                            box-shadow: aaaaa bbbbb cccccccccccccccccccc,
                                        ddddd eeee ffffffffffffffffffffff;
                        }
                    }
                    
                `,
            });
        });
        describe('value functions', () => {
            it('should set (short) single argument in one line', () => {
                testFormatCss({
                    deindent: true,
                    source: `.root {background:someFunc(aaa bbb, ccc);}`,
                    expect: `
                        .root {
                            background: someFunc(aaa bbb, ccc);
                        }
        
                    `,
                });
            });
            it('should not break function that can be inlined in 30 chars', () => {
                /**
                 * rgba(255, 255, 255, 0.255) - 26 chars
                 */
                testFormatCss({
                    deindent: true,
                    source: `.root {pppppppppppppppppppppppppppppppppppppppppppp:aaaaa(xxxxxxxxxxxxxxxxxxxxxxx);ssssssssssssssssssssssssssssssssssssssssssss:bbbbb aaaaa(xxxxxxxxxxxxxxxxxxxxxxx) ccccc;}`,
                    X: '|-------------------------------------80---------------------------------------|',
                    expect: `
                        .root {
                            pppppppppppppppppppppppppppppppppppppppppppp: aaaaa(xxxxxxxxxxxxxxxxxxxxxxx);
                            ssssssssssssssssssssssssssssssssssssssssssss: bbbbb
                                                                          aaaaa(xxxxxxxxxxxxxxxxxxxxxxx)
                                                                          ccccc;
                        }
        
                    `,
                });
            });
            it('should break long nested functions arguments into lines', () => {
                testFormatCss({
                    deindent: true,
                    source: `
                        .root {background:aaaaaaaa(bbbbbbbb(xxxxxxxxxxxxxxx, yyyyyyyyyyyyyyyy, zzzzzzzzzzzzzzzz));}
                    `,
                    X: '|-------------------------------------80---------------------------------------|',
                    expect: `
                        .root {
                            background: aaaaaaaa(
                                            bbbbbbbb(
                                                xxxxxxxxxxxxxxx,
                                                yyyyyyyyyyyyyyyy,
                                                zzzzzzzzzzzzzzzz
                                            )
                                        );
                        }
        
                    `,
                });
            });
            it('should respect newlines inside argument when function is in a different line then the prop', () => {
                testFormatCss({
                    deindent: true,
                    source: `
                        .root {
                            background:
                                aaaaaaaa(bbbbbbbb(xxxxxxxxxxxxxxx 
                                ???, 
                                yyyyyyyyyyyyyyy, zzzzzzzzzzzzzzz));}
                    `,
                    X: '|-------------------------------------80---------------------------------------|',
                    expect: `
                        .root {
                            background:
                                aaaaaaaa(
                                    bbbbbbbb(
                                        xxxxxxxxxxxxxxx
                                        ???,
                                        yyyyyyyyyyyyyyy,
                                        zzzzzzzzzzzzzzz
                                    )
                                );
                        }
        
                    `,
                });
            });
            it('should keep function in a single line if its below the max range', () => {
                testFormatCss({
                    deindent: true,
                    source: `
                        .root {background:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa(bbbbbbbbbbbbb(x, y, z));}
                    `,
                    X: '|-------------------------------------80---------------------------------------|',
                    expect: `
                        .root {
                            background: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa(
                                            bbbbbbbbbbbbb(x, y, z)
                                        );
                        }
        
                    `,
                });
            });
            it('should force argument in newline for overflow function', () => {
                testFormatCss({
                    deindent: true,
                    source: `
                        .root {background:aaaaaaaaaaaaa(bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb(xxx, yyy, zzz));}
                    `,
                    X: '|-------------------------------------80---------------------------------------|',
                    expect: `
                        .root {
                            background: aaaaaaaaaaaaa(
                                            bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb(
                                                xxx,
                                                yyy,
                                                zzz
                                            )
                                        );
                        }
        
                    `,
                });
            });
            it('should wrap functions and arguments according to available space', () => {
                testFormatCss({
                    deindent: true,
                    source: `
                        .root {background: aaaaa bbbbb(111111111111111111111111111111111111,222222222222222222) cccccc;}
                    `,
                    X: '|-------------------------------------80---------------------------------------|',
                    expect: `
                        .root {
                            background: aaaaa bbbbb(
                                            111111111111111111111111111111111111,
                                            222222222222222222
                                        ) cccccc;
                        }
        
                    `,
                });
            });
            it('should handle complex case', () => {
                testFormatCss({
                    deindent: true,
                    source: `
                        .root {background: filledBtn(bg-hover var(--background-hover-color, red), text-hover lighten(var(--aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa),10%)),filledBtn(bg-hover var(--background-hover-color), text-hover var(--color-accent-1));}
                    `,
                    X: '|-------------------------------------80---------------------------------------|',
                    expect: `
                        .root {
                            background: filledBtn(
                                            bg-hover var(--background-hover-color, red),
                                            text-hover lighten(
                                                var(--aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa),
                                                10%
                                            )
                                        ),
                                        filledBtn(
                                            bg-hover var(--background-hover-color),
                                            text-hover var(--color-accent-1)
                                        );
                        }
        
                    `,
                });
            });
        });
    });
    describe('at-rule', () => {
        it('no children only atRule (no semi colon)', () => {
            testFormatCss({
                deindent: true,
                source: `@namespace "abc"`,
                expect: `
                    @namespace "abc"

                `,
            });
        });
        it('no children only atRule', () => {
            testFormatCss({
                deindent: true,
                source: `@namespace "abc";`,
                expect: `
                    @namespace "abc";

                `,
            });
        });
        it('should set body into lines and indent accordingly', () => {
            testFormatCss({
                deindent: true,
                source: `@font-face { font-family: "Open Sans";}`,
                expect: `
                    @font-face {
                        font-family: "Open Sans";
                    }

                `,
            });
        });
        it('should set a single space around comment between name and params', () => {
            testFormatCss({
                deindent: true,
                source: `
                    @namespace/**/"abc";
                    @namespace /**/ "def";
                    @namespace   /**/   "ghi";
                    @namespace/*1*/;
                    @namespace   /*2*/  ;
                    @namespace["123"];
                `,
                expect: `
                    @namespace /**/ "abc";
                    @namespace /**/ "def";
                    @namespace /**/ "ghi";
                    @namespace /*1*/;
                    @namespace /*2*/;
                    @namespace ["123"];

                `,
            });
        });
        it('should set a single space around comment after params', () => {
            testFormatCss({
                deindent: true,
                source: `
                    @namespace "abc"/**/;
                    @namespace "def"   /**/   ;
                `,
                expect: `
                    @namespace "abc" /**/;
                    @namespace "def" /**/;

                `,
            });
        });
        it('should set a single space after name and params', () => {
            testFormatCss({
                deindent: true,
                source: `
                    @media     screen     {};
                `,
                expect: `
                    @media screen {};

                `,
            });
        });
        describe('params', () => {
            it('should normalize comma space in params', () => {
                testFormatCss({
                    deindent: true,
                    source: `
                        @L1 a,b  ,  c,d {}
        
                        @L2 a,b(c,d  ,  e) , f {}
                    `,
                    expect: `
                        @L1 a, b, c, d {}
        
                        @L2 a, b(c, d, e), f {}
        
                    `,
                });
            });
            it('should remove function and blocks args before/after spaces', () => {
                // ToDo(fix): missing newline between function and square OR
                //            unremoved newline between parens and function?
                testFormatCss({
                    deindent: true,
                    source: `
                        @parens (   a1: 1px, ( a2: 2px ) ( a3: 3px )  ) {}
        
                        @function f(   b1, b2, f-nest(  b3   )  ) {}

                        @square [   c1, c2, c3[  c4   ]  ) {}
                        
                    `,
                    expect: `
                        @parens (a1: 1px, (a2: 2px) (a3: 3px)) {}
        
                        @function f(b1, b2, f-nest(b3)) {}
                        @square [c1, c2, c3[c4]) {}
        
                    `,
                });
            });
            it('should force argument-like indented newlines when block open contains a newline', () => {
                testFormatCss({
                    deindent: true,
                    source: `
                        @parens (
                            a1: 1px, ( a2-inline: 2px ), (
                                a3: 3px, a4: 5px
                            ) ) {}

                        @square [
                            b1: 1px, [ b2-inline: 2px ], [
                                b3: 3px, b4: 5px
                            ] ] {}

                        @function f(
                            c1: 1px, f-inline( c2: 2px ), f-indent(
                                c3: 3px, c4: 5px
                            ) ) {}

                        @mix (
                            d1: 1px, d2: 2px, func(
                                d3: 3px, [
                                    d4: 4px, [
                                        d5: 5px, d6: 6px
                                    ]
                                ]
                            )
                        ) {}
                    `,
                    expect: `
                        @parens (
                            a1: 1px,
                            (a2-inline: 2px),
                            (
                                a3: 3px,
                                a4: 5px
                            )
                        ) {}

                        @square [
                            b1: 1px,
                            [b2-inline: 2px],
                            [
                                b3: 3px,
                                b4: 5px
                            ]
                        ] {}

                        @function f(
                            c1: 1px,
                            f-inline(c2: 2px),
                            f-indent(
                                c3: 3px,
                                c4: 5px
                            )
                        ) {}

                        @mix (
                            d1: 1px,
                            d2: 2px,
                            func(
                                d3: 3px,
                                [
                                    d4: 4px,
                                    [
                                        d5: 5px,
                                        d6: 6px
                                    ]
                                ]
                            )
                        ) {}
        
                    `,
                });
            });
        });
        it('should indent body (no newline before first rule)', () => {
            testFormatCss({
                deindent: true,
                source: `
                    @media screen {.root {color: red;}}
                    @media scream {
                        
                        
                        .root {color: red;}
                    
                    
                    }
                `,
                expect: `
                    @media screen {
                        .root {
                            color: red;
                        }
                    }

                    @media scream {
                        .root {
                            color: red;
                        }
                    }

                `,
            });
        });
        it('should break and indent long selectors in nested rules', () => {
            testFormatCss({
                deindent: true,
                source: `
                    @media screen {.${'X'.repeat(50)},.${'Y'.repeat(50)} {}}
                `,
                expect: `
                    @media screen {
                        .${'X'.repeat(50)},
                        .${'Y'.repeat(50)} {}
                    }

                `,
            });
        });
        it('should set line separation between rule before at-rule with no children', () => {
            testFormatCss({
                deindent: true,
                source: `
                    .a {}
                    @namespace "a";

                    .b {}



                    @namespace "b";
                `,
                expect: `
                    .a {}

                    @namespace "a";

                    .b {}

                    @namespace "b";

                `,
            });
        });
    });
});
