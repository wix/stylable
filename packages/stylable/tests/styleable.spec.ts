import { styleable } from "../src/styleable";
import { expect } from "chai";


describe('styleable', function () {

    describe('create', function () {

        it('create a stylesheet from css', function () {

            var sheet = styleable.create(`
                .container { }
            `)

            expect(sheet.classes).to.eql({
                container: "container"
            });

        });

        it('create a stylesheet from css with multiple selectors', function () {

            var sheet = styleable.create(`
                .container { }
                .image { }
            `)

            expect(sheet.classes).to.eql({
                container: "container",
                image: "image"
            });

        });

        it('create a stylesheet from css with nested selector', function () {

            var sheet = styleable.create(`
                .container .image { } 
            `)

            expect(sheet.classes).to.eql({
                container: "container",
                image: "image"
            });

        });


        it('create a stylesheet from css with multiple selectors in the same declaration', function () {

            var sheet = styleable.create(`
                .container, .wrapper .image { } 
            `)

            expect(sheet.classes).to.eql({
                container: "container",
                image: "image",
                wrapper: "wrapper"
            });

        });

    });

    describe('meta', function () {

        it('create css in js definition', function () {

            var sheet = styleable.create(`
                .container {
                    color: red;
                }
            `);

            expect(sheet.meta.cssDefinition).to.eql({
                ".container": { color: "red" }
            });

        });

        it('create typedClasses definitions', function () {

            var sheet = styleable.create(`
                .container {
                    -sb-root: true;
                    color: red;
                }
            `);

            expect(sheet.meta.typedClasses).to.eql({
                container: {
                    SbRoot: true
                }
            });

        });

        it('throw when -sb-root used in complex selector', function () {

            expect(function () {
                styleable.create(`
                    .container[attr] {
                        -sb-root: true;
                        color: red;
                    }
                `);
            }).throw('-sb-root on complex selector: .container[attr]');

        });

        it('create import definitions', function () {
            /*
                
                :import("./path/to/thing"){
                    -sb-default: Name;
                    -sb-named: Button as Btn, Icon;
                    -sb-named-Name: MyName;
                }

                :import{
                    -sb-from: "./path/to/thing";
                    -sb-default: Name;
                    -sb-named: Button as Btn, Icon;
                    -sb-named-Name: MyName;
                }

             */
            var sheet = styleable.create(`
                
            `);

            expect(sheet.meta.typedClasses).to.eql({
                container: {
                    SbType: {
                        from: "./button",
                        default: "Button",
                        named: {}
                    }
                }
            });

        });

    });

    describe('generate', function () {

        it('skips empty selectors', function () {

            var sheet = styleable.create(`
            .container { }
            .image { }
        `);

            const css = styleable.generate(sheet)

            expect(css).to.eql([]);

        });

        it('generate css from single sheet', function () {

            var sheet = styleable.create(`
            .container {
                color: black;
            }
        `);

            const css = styleable.generate(sheet);

            expect(css).to.eql(['.container {\n    color: black\n}']);

        });


        it('generate css from multiple sheets', function () {

            var sheetA = styleable.create(`
            .container {
                color: black;
            }
        `);

            var sheetB = styleable.create(`
            .container {
                color: white;
            }
        `);

            const css = styleable.generate(sheetA, sheetB);

            expect(css).to.eql([
                '.container {\n    color: black\n}',
                '.container {\n    color: white\n}',
            ]);

        });

    });

});


