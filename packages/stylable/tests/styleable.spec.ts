import { Generator } from '../src/generator';
import { styleable } from '../src/styleable';
import { Stylesheet } from '../src/stylesheet';
import { expect } from "chai";


describe('styleable', function () {

    describe('generate', function () {

        it('include empty selectors', function () {

            var sheet = Stylesheet.fromCSS(`
                .container {}
                .image {}
            `);

            const css = styleable.generate(sheet)

            expect(css).to.eql([".container {}", ".image {}"]);

        });

        it('generate css from single sheet', function () {

            var sheet = Stylesheet.fromCSS(`
                .container {
                    color: black;
                }
            `);

            const css = styleable.generate(sheet);

            expect(css).to.eql(['.container {\n    color: black\n}']);

        });


        it('generate css from multiple sheets', function () {

            var sheetA = Stylesheet.fromCSS(`
                .container {
                    color: black;
                }
            `);

            var sheetB = Stylesheet.fromCSS(`
                .container {
                    color: white;
                }
            `);

            const css = styleable.generate([sheetA, sheetB]);

            expect(css).to.eql([
                '.container {\n    color: black\n}',
                '.container {\n    color: white\n}',
            ]);

        });


        it('generate scoped selector', function () {

            var sheet = Stylesheet.fromCSS(`
                .container {
                    color: white;
                }
            `, "TheNameSpace");

            const css = styleable.generate(sheet, new Generator({ namespaceDivider: "__THE_DIVIDER__" }));

            expect(css).to.eql([
                '.TheNameSpace__THE_DIVIDER__container {\n    color: white\n}'
            ]);

        });

        it('generate do not output :import', function () {

            var sheet = Stylesheet.fromCSS(`
                :import("./relative/path/to/sheetA.styleable.css"){
                    -sb-default: ContainerA;
                }
                :import("./relative/path/to/sheetB.styleable.css"){
                    -sb-default: ContainerB;
                }
                .container {
                    color: white;
                }
            `, "TheNameSpace");

            const css = styleable.generate(sheet, new Generator({ namespaceDivider: "__THE_DIVIDER__" }));

            expect(css).to.eql([
                '.TheNameSpace__THE_DIVIDER__container {\n    color: white\n}'
            ]);

        });

        it('generate scoped selector 222', function () {

            var sheetA = Stylesheet.fromCSS(`
                .containerA {
                    -sb-root: true;
                }
                .icon { }
            `, "TheNameSpace");


            var sheetB = Stylesheet.fromCSS(`
                :import("./relative/path/to/sheetA.styleable.css"){
                    -sb-default: Container;
                }
                .containerB {
                    -sb-root: true;
                    -sb-type: Container;
                }
                .containerB::icon { }
            `, "TheGreatNameSpace");

            const css = styleable.generate([sheetB], new Generator({
                namespaceDivider: "__THE_DIVIDER__",
                resolver: {
                    resolve() {
                        return sheetA;
                    }
                }
            }));

            const res = [
                '.TheNameSpace__THE_DIVIDER__containerA {}',
                '.TheNameSpace__THE_DIVIDER__icon {}',
                '.TheGreatNameSpace__THE_DIVIDER__containerB {}',
                '.TheGreatNameSpace__THE_DIVIDER__containerB .TheNameSpace__THE_DIVIDER__containerA .TheNameSpace__THE_DIVIDER__icon{}'
            ];

            css.forEach((chunk, index) => expect(chunk).to.eql(res[index]));
            expect(css).length.to.equal(res.length);
        });


    });

});


