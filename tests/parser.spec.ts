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

        const whitespaceRemoved = Object.keys(actual).reduce((o, selector: string) => {
            o[selector.replace(/\s*/gm, '')] = actual[selector];
            return o;
        }, {} as any);

        expect(whitespaceRemoved).to.eql(expected);

    });

    it('@namespace', function () {

        const actual = objectify(`
            @namespace value;
        `)
        const expected = {
            "@namespace": "value"
        }

        expect(actual).to.eql(expected);
    });

    it('@namespace2', function () {

        const actual = objectify(`
            @namespace value;
            @namespace value2;
        `)
        const expected = {
            "@namespace": ["value", "value2"]
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

    xdescribe('nesting', function () {

        it('should create empty selectors', function () {
            //this is useful because the empty elements can be pseudo-elements for other stylesheet 
            const actual = objectify(`
                .container {
                    .icon{
                        color: red;
                    }
                    &:hover {

                    }    
                }
            `);
            
            const expected = {
                ".container": {},
                ".container:hover": {},
                ".container .icon": { color: 'red' }
            }
            
            expect(actual).to.eql(expected);

        });

    });

    describe('noCamel option', function () {

        it('should not camel case matching rules', function () {

            const actual = objectify(`
                .container {
                   -sb-something: true;
                   background-color: red;
                }
            `);
            
            const expected = {
                ".container": {
                    "-sb-something": "true",
                    backgroundColor: "red"
                }            
            }
            
            expect(actual).to.eql(expected);

        });

    })

    xit('big css', function () {
        var count = 100;
        while (count--) {


            objectify(`
            body {
                font-size: 10px;
                font-family: Arial;
                float: right;
                padding: 0px;
                margin: 0px
            }

            .DivMain {
                width: 980px;
                height: 210px;
                background-image: url(../images/ynetshops980X210.png)
            }

            .TitleRed {
                font-size: 20px;
                color: #da1318;
                display: block;
                position: absolute;
                top: 10px;
                left: 10px;
                text-align: left
            }

            .image_carousel {
                padding: 37px 0px 0px 0px;
                position: relative
            }

            .item {
                text-align: center;
                width: 170px;
                height: 170px;
                border: 0px solid #ccc;
                padding: 0px 0px 0px 0px;
                margin: 0px 5px 0px 5px;
                display: block;
                float: left
            }

            .item a {
                outline: none;
                text-decoration: none
            }

            .item img {
                border: 0px;
                margin: 0px 0px 1px 0px
            }

            .Price {
                padding-right: 32px;
                font-size: 11px;
                color: #900;
                font-weight: bold;
                text-align: right
            }

            .productname {
                padding-right: 32px;
                font-size: 11px;
                text-align: right;
                color: #004b91;
                direction: rtl
            }

            a.prev,a.next {
                background: url(../images/miscellaneous_sprite.png) no-repeat transparent;
                width: 45px;
                height: 50px;
                display: block;
                position: absolute;
                top: 85px
            }

            a.prev {
                left: 5px;
                background-position: 0 0
            }

            a.prev:hover {
                background-position: 0 -50px
            }

            a.prev.disabled {
                background-position: 0 -100px!important
            }

            a.next {
                right: 5px;
                background-position: -50px 0
            }

            a.next:hover {
                background-position: -50px -50px
            }

            a.next.disabled {
                background-position: -50px -100px!important
            }

            a.prev.disabled,a.next.disabled {
                cursor: default
            }

            a.prev span,a.next span {
                display: none
            }

            .pagination {
                display: block;
                position: absolute;
                top: 40px;
                left: 10px;
                text-align: left
            }

            .pagination a {
                background: url(../images/miscellaneous_sprite.png) 0 -300px no-repeat transparent;
                width: 15px;
                height: 15px;
                margin: 0 5px 0 0;
                display: inline-block
            }

            .pagination a.selected {
                background-position: -25px -300px;
                cursor: default
            }

            .pagination a span {
                display: none
            }

            .clearfix {
                float: none;
                clear: both
            }

        `);

        }
    });

}



describe('Parser (objectify postcss js)', function () {
    objectifyTests(objectifyCSS);
});

describe('Parser (objectify stylis)', function () {
    objectifyTests(objectifyCSSStylis);
});
