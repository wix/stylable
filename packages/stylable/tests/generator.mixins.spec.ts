import { Generator } from '../src/generator';
import { Stylesheet } from '../src/stylesheet';
import { expect } from "chai";


describe('static Generator mixins', function () {

    it('should add rules to the root selector', function () {

        function mixin(options: any) {
            return {
                color: options.param1
            }
        }

        const sheet = Stylesheet.fromCSS(`
            :import("./relative/path/to/mixin.js") {
                -sb-default: MyMixin;
            }
            .container { 
                -sb-mixin-MyMixin-param1: red;                
            }
        `, "StyleA");


        const gen = new Generator({
            namespaceDivider: "__"
        });

        const selectorObject = gen.prepareSelector(sheet, '.container', {
            MyMixin: mixin
        }, []);

        expect(selectorObject).to.eql({
            ".StyleA__container": {
                color: "red"
            }
        });


    });

    it('should add child selectors', function () {

        function mixin(options: any) {
            return {
                ":hover": {
                    color: options.param1
                }
            }
        }

        const sheet = Stylesheet.fromCSS(`
            :import("./relative/path/to/mixin.js") {
                -sb-default: MyMixin;
            }
            .container { 
                -sb-mixin-MyMixin-param1: red;
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

        function mixin(options: any) {
            return {
                "&:hover": {
                    color: options.param1
                }
            }
        }

        const sheet = Stylesheet.fromCSS(`
            :import("./relative/path/to/mixin.js") {
                -sb-default: MyMixin;
            }
            .container { 
                -sb-mixin-MyMixin-param1: red;
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

        function colorMixin(options: any) {
            return {
                color: options.param1,
                "&:hover": {
                    color: options.param2
                }
            }
        }

        
        function mixin(options: any) {
            return {
                "& > *": {
                    background: options.param1,
                    ...colorMixin({param1: 'red', param2: 'green'})
                },
                
            }
        }

        const sheet = Stylesheet.fromCSS(`
            :import("./relative/path/to/mixin.js") {
                -sb-default: MyMixin;
            }
            .container { 
                -sb-mixin-MyMixin-param1: red;
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
                rules: { background: "red", color: "red" }
            },
            {
                selector: ".container > *:hover",
                rules: { color: "green" }
            }
        ]);

    });

});
