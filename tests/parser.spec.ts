import { objectifyCSSStylis, objectifyCSS } from '../src/parser';
import { expect } from "chai";


function objectifyTests(objectify: (css: string) => any) {

    it('simple css', function () {

        const actual = objectify(`
            .btn {
                color: red;
            }
        `)
        const expected = {
            ".btn": { "color": "red" }
        }

        expect(actual).to.eql(expected);
    });


    it('multiple selectors', function () {

        const actual = objectify(`
            .btn {
                color: red;
            }
            .label {
                color: red;
            }
        `)
        const expected = {
            ".btn": { "color": "red" },
            ".label": { "color": "red" },
        }

        expect(actual).to.eql(expected);
    });



    it('multiple rules', function () {

        const actual = objectify(`
            .btn {
                color: red;
                background: red;
            }
        `)
        const expected = {
            ".btn": { "color": "red", "background": "red" }
        }

        expect(actual).to.eql(expected);
    });


    it('multiple values', function () {

        const actual = objectify(`
            .btn {
                box-shadow: 0, 1, 2;
            }
        `)
        const expected = {
            ".btn": { "boxShadow": "0, 1, 2" }
        }

        expect(actual).to.eql(expected);
    });


    it('content', function () {

        const actual = objectify(`
            .btn::after {
                content: "abc";
            }
        `)
        const expected = {
            ".btn::after": { "content": '"abc"' }
        }

        expect(actual).to.eql(expected);
    });

    it('kebab to camel case', function () {

        const actual = objectify(`
            .btn {
                border-radius: 0;
                -vendor-border-radius: 0;
            }
        `)
        const expected = {
            ".btn": { "borderRadius": "0", "VendorBorderRadius": "0" }
        }

        expect(actual).to.eql(expected);
    });


    it('pseudo functions', function () {

        const actual = objectify(`
            .btn :global(.label) {
                border-radius: 0;
            }
        `)
        const expected = {
            ".btn :global(.label)": { "borderRadius": "0" }
        }

        expect(actual).to.eql(expected);
    });


    it('multiple rules with same name', function () {

        const actual = objectify(`
            .btn {
                border-radius: 0;
                border-radius: 1;
            }
        `);

        const expected = {
            ".btn": { "borderRadius": ["0", "1"] }
        }

        expect(actual).to.eql(expected);

    });



    it('multiple selectors with same name', function () {

        const actual = objectify(`
            .btn {
                border-radius: 0;
            }
            .class {

            }
            .btn {
                border-radius: 1;
            }
        `);

        const expected = {
            ".btn": { "borderRadius": ["0", "1"] },
            ".class": {}
        }

        expect(actual).to.eql(expected);

    });

    //white space diff
    it('multiple selectors separated by ,', function () {

        const actual = objectify(`
            .btn, 
            div {
                border-radius: 0;
            }
        `);

        const expected = {
            ".btn,div": { "borderRadius": "0" }
        }
        
        const whitespaceRemoved = Object.keys(actual).reduce((o, selector: string)=>{
            o[selector.replace(/\s*/gm, '')] = actual[selector];
            return o;
        }, {} as any);

        expect(whitespaceRemoved).to.eql(expected);

    });

    it('@namespace', function () {

        const actual = objectify(`
            @namespace value
        `)
        const expected = {
            "@namespace value": true
        }

        expect(actual).to.eql(expected);
    });


    it('@media query', function () {

        const actual = objectify(`
            @media screen {
                .btn {
                    border-radius: 0;
                }    
            }
        `);

        const expected = {
            "@media screen": {
                ".btn": { "borderRadius": "0" },
            }
        }

        expect(actual).to.eql(expected);

    });

    it('@media query multiple', function () {

        const actual = objectify(`
            @media screen {
                .btn {
                    border-radius: 0;
                }    
            }
            @media screen {
                .btn {
                    border-radius: 1;
                }    
            }
        `);

        const expected = {
            "@media screen": [
                {
                    ".btn": { "borderRadius": "0" }
                },
                {
                    ".btn": { "borderRadius": "1" }
                }
            ]
        }

        expect(actual).to.eql(expected);

    });


    it('@fontface', function () {

        const actual = objectify(`
            @font-face {
                font-family: myFirstFont;
                src: url(sansation_light.woff);
            }
        `);

        const expected = {
            "@font-face": {
                "fontFamily": "myFirstFont",
                "src": "url(sansation_light.woff)"
            }
        }

        expect(actual).to.eql(expected);

    });

    it('@fontface (multiple)', function () {

        const actual = objectify(`
            @font-face {
                font-family: myFirstFont;
                src: url(sansation_light.woff);
            }
            @font-face {
                font-family: myFirstFont2;
                src: url(sansation_light.woff);
            }
        `);

        const expected = {
            "@font-face": [
                {
                    "fontFamily": "myFirstFont",
                    "src": "url(sansation_light.woff)"
                }, {
                    "fontFamily": "myFirstFont2",
                    "src": "url(sansation_light.woff)"
                }
            ]
        }

        expect(actual).to.eql(expected);

    });

    it('@keyframes', function () {

        const actual = objectify(`
            @keyframes identifier {
                0% { top: 0; }
                100% { top: 100px; }
            }
        `);

        const expected = {
            "@keyframes identifier": {
                "0%": { top: "0" },
                "100%": { top: "100px" }
            }
        }
        expect(actual).to.eql(expected);

    });

}

describe('Parser (objectify stylis)', function () {
    console.time('stylis')
    objectifyTests(objectifyCSSStylis);
    console.timeEnd('stylis')
});

describe('Parser (objectify postcss js)', function () {
    console.time('postcss')
    objectifyTests(objectifyCSS);
    console.timeEnd('postcss')
});

