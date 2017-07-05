import { Generator } from '../src/generator';
import { Stylesheet } from '../src/stylesheet';
import { expect } from "chai";


describe('static Generator mixins', function () {

    it('should add rules to the root selector', function () {

        function mixin(options: string[]) {
            return {
                color: options[0]
            }
        }

        const sheet = Stylesheet.fromCSS(`
            :import("./relative/path/to/mixin.js") {
                -sb-default: MyMixin;
            }
            .container { 
                -sb-mixin: MyMixin(red);                
            }
        `, "StyleA");


        const gen = new Generator({
            namespaceDivider: "__"
        });

        const stack: any = [];

        gen.prepareSelector(sheet, '.container', {
            MyMixin: mixin
        }, stack);
        
        expect(stack[0]).to.eql({
            selector: '.container',
            rules: {
                color: "red"
            }
        });


    });

    it('should add child selectors', function () {

        function mixin(options: string[]) {
            return {
                ":hover": {
                    color: options[0]
                }
            }
        }

        const sheet = Stylesheet.fromCSS(`
            :import("./relative/path/to/mixin.js") {
                -sb-default: MyMixin;
            }
            .container { 
                -sb-mixin: MyMixin(red);
            }
        `, "StyleA");


        const gen = new Generator({
            namespaceDivider: "__"
        });

        const stack: any = [];

        gen.prepareSelector(sheet, '.container', {
            MyMixin: mixin
        }, stack);

        expect(stack[0]).to.eql({
            selector: '.container :hover',
            rules: {
                color: "red"
            }
        });

    });


    it('should add extended selectors (&) in the first level', function () {

        function mixin(options: string[]) {
            return {
                "&:hover": {
                    color: options[0]
                }
            }
        }

        const sheet = Stylesheet.fromCSS(`
            :import("./relative/path/to/mixin.js") {
                -sb-default: MyMixin;
            }
            .container { 
                -sb-mixin: MyMixin(red);
            }
        `, "StyleA");


        const gen = new Generator({
            namespaceDivider: "__"
        });

        const stack: any = [];

        gen.prepareSelector(sheet, '.container', {
            MyMixin: mixin
        }, stack);

        expect(stack[0]).to.eql({
            selector: ".container:hover",
            rules: { color: "red" }
        });

    });

    it('should handle nested mixins', function () {

        function colorMixin(options: string[]) {
            return {
                color: options[0],
                "&:hover": {
                    color: options[1]
                }
            }
        }

        
        function mixin(options: string[]) {
            return {
                "& > *": {
                    background: options[0],
                    border: options[1],
                    ...colorMixin(['red', 'green'])
                },
                
            }
        }

        const sheet = Stylesheet.fromCSS(`
            :import("./relative/path/to/mixin.js") {
                -sb-default: MyMixin;
            }
            .container { 
                -sb-mixin: MyMixin(red, 10px solid black);
            }
        `, "StyleA");


        const gen = new Generator({
            namespaceDivider: "__"
        });

        const stack: any = [];

        gen.prepareSelector(sheet, '.container', {
            MyMixin: mixin
        }, stack);

        expect(stack).to.eql([
            {
                selector: ".container > *",
                rules: { background: "red", border: "10px solid black", color: "red" }
            },
            {
                selector: ".container > *:hover",
                rules: { color: "green" }
            }
        ]);

    });

});
