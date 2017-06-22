import { styleable } from '../src/styleable';
import { Stylesheet } from '../src/stylesheet';
import { expect } from "chai";


describe('styleable', function () {

    describe('generate', function () {

        it('skips empty selectors', function () {

            var sheet = Stylesheet.fromCSS(`
                .container { }
                .image { }
            `);

            const css = styleable.generate(sheet)

            expect(css).to.eql([]);

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

            const css = styleable.generate(sheet, { namespaceDivider: "__THE_DIVIDER__" });

            expect(css).to.eql([
                '.TheNameSpace__THE_DIVIDER__container {\n    color: white\n}'
            ]);

        });


    });

});


