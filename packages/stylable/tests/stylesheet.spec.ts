import { Stylesheet, InMemoryContext } from "../src/stylesheet";
import { expect } from "chai";

describe('Stylesheet', function () {


    describe('create', function () {

        it('create css in js definition', function () {

            var sheet = Stylesheet.fromCSS(`
                .container {
                    color: red;
                }
            `);

            expect(sheet.cssDefinition).to.eql({
                ".container": { color: "red" }
            });

        });

        it('create a stylesheet from css', function () {

            var sheet = Stylesheet.fromCSS(`
                .container { }
            `)

            expect(sheet.classes).to.eql({
                container: "container"
            });

        });

        it('create a stylesheet from css with multiple selectors', function () {

            var sheet = Stylesheet.fromCSS(`
                .container { }
                .image { }
            `)

            expect(sheet.classes).to.eql({
                container: "container",
                image: "image"
            });

        });

        it('create a stylesheet from css with nested selector', function () {

            var sheet = Stylesheet.fromCSS(`
                .container .image { } 
            `)

            expect(sheet.classes).to.eql({
                container: "container",
                image: "image"
            });

        });


        it('create a stylesheet from css with multiple selectors in the same declaration', function () {

            var sheet = Stylesheet.fromCSS(`
                .container, .wrapper .image { } 
            `)

            expect(sheet.classes).to.eql({
                container: "container",
                image: "image",
                wrapper: "wrapper"
            });

        });

    });

    describe('process', function () {


        it('throw when -sb-root used in complex selector', function () {

            expect(function () {
                Stylesheet.fromCSS(`
                    .container[attr] {
                        -sb-root: true;
                        color: red;
                    }
                `);
            }).throw('-sb-root on complex selector: .container[attr]');

        });

        it('with empty css', function () {
            const sheet = Stylesheet.fromCSS(``);

            expect(sheet.classes).to.eql({});
            expect(sheet.typedClasses).to.eql({});
        });

        it('with typed class -sb-root true', function () {

            const sheet = Stylesheet.fromCSS(`
                .container {
                    -sb-root: true;
                }
            `);

            expect(sheet.typedClasses).to.eql({
                container: {
                    SbRoot: true
                }
            });

        });

        it('with typed class -sb-root ANY_VALUE that is not "false"', function () {
            const sheet = Stylesheet.fromCSS(`
                .container {
                    -sb-root: ANY_VALUE;
                }
            `);

            expect(sheet.typedClasses).to.eql({
                container: {
                    SbRoot: true
                }
            })
        });

        it('with typed class -sb-root is false', function () {
            const sheet = Stylesheet.fromCSS(`
                .container {
                    -sb-root: false;
                }
            `);

            expect(sheet.typedClasses).to.eql({
                container: {
                    SbRoot: false
                }
            })
        });

        it('create import definitions (format A)', function () {

            var sheet = Stylesheet.fromCSS(`
                :import("./path/to/thing"){
                    -sb-default: Name;
                    -sb-named: Button as Btn, Icon;
                    -sb-named-Name: MyName;
                }
            `);

            expect(sheet.imports).to.eql([
                {
                    SbFrom: "./path/to/thing",
                    SbDefault: "Name",
                    SbNamed: {
                        Button: "Btn",
                        Icon: "Icon",
                        Name: "MyName"
                    }
                }
            ]);

        });

        it('create import definitions (format B)', function () {

            var sheet = Stylesheet.fromCSS(`
                :import {
                    -sb-from: "./path/to/thing";
                }
            `);

            expect(sheet.imports).to.eql([
                {
                    SbFrom: "./path/to/thing",
                    SbDefault: "",
                    SbNamed: {}
                }
            ]);

        });

    });

    describe('generate', function () {

        let ctx: InMemoryContext;

        beforeEach(() => {
            ctx = new InMemoryContext();
        });

        it('generate empty', function () {
            const stylesheet = new Stylesheet({});
            stylesheet.generate(ctx);
            expect(ctx.buffer).to.eql([]);
        });

        it('generate with single rule', function () {
            const stylesheet = new Stylesheet({
                ".container": { color: "black" }
            });
            stylesheet.generate(ctx);
            expect(ctx.buffer).to.eql([".container {\n    color: black\n}"]);
        });

        it('generate with multiple rules', function () {
            const stylesheet = new Stylesheet({
                ".container": { color: "black", background: "white" }
            });
            stylesheet.generate(ctx);
            expect(ctx.buffer).to.eql([".container {\n    color: black;\n    background: white\n}"]);
        });

        it('generate with multiple selectors', function () {
            const stylesheet = new Stylesheet({
                ".container": { color: "black" },
                ".wrapper": { background: "white" }
            });
            stylesheet.generate(ctx);
            expect(ctx.buffer).to.eql([
                ".container {\n    color: black\n}",
                ".wrapper {\n    background: white\n}"
            ]);
        });

    });

});

