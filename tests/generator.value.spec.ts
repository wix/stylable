import { Generator } from '../src/generator';
import { Stylesheet } from '../src/stylesheet';
import { expect } from "chai";


describe('Generator variables interpolation', function () {
    it('should not output :vars selector', function () {


        const sheet = Stylesheet.fromCSS(`
            :vars {
                param: red;
            }
        `, "");

        const css = Generator.generate([sheet], new Generator({
            namespaceDivider: "__"
        }));

        expect(css.length).to.equal(0);

    });

    it('should inline value() usage', function () {


        const sheet = Stylesheet.fromCSS(`
            :vars {
                param: red;
            }
            .container { 
                color: value(param);
            }
        `, "");

        const css = Generator.generate([sheet], new Generator({
            namespaceDivider: "__"
        }));

        const res = [
            '.container {\n    color: red\n}'
        ];

        css.forEach((chunk, index) => expect(chunk).to.eql(res[index]));
        expect(css.length).to.equal(res.length);
    });


    it('should resolve value() usage in variable declaration', function () {

        const sheet = Stylesheet.fromCSS(`
            :vars {
                param2: red;
                param: value(param2);
            }
            .container { 
                color: value(param);
            }
        `, "");

        const css = Generator.generate([sheet], new Generator({
            namespaceDivider: "__"
        }));

        const res = [
            '.container {\n    color: red\n}'
        ];

        css.forEach((chunk, index) => expect(chunk).to.eql(res[index]));
        expect(css.length).to.equal(res.length);
    });

    it('should throw on recursive resolve', function () {

        const sheet = Stylesheet.fromCSS(`
            :vars {
                param2: value(param1);
                param: value(param2);
            }
            .container { 
                color: value(param);
            }
        `, "");
        
        expect(function(){
            Generator.generate([sheet], new Generator({}));
        }).to.throw('Unresolvable variable');

    });

    it('should support default value', function () {
        const sheet = Stylesheet.fromCSS(`
            :vars {
                param: red;
                param2: blue
            }
            .container {
                background-color: value(param, blue);
                color: value(param3, green);
            }
        `, "");

        const css = Generator.generate([sheet], new Generator({
            namespaceDivider: "__"
        }));

        const res = [
            '.container {\n    background-color: red;\n    color: green\n}'
        ];

        css.forEach((chunk, index) => expect(chunk).to.eql(res[index]));
        expect(css.length).to.equal(res.length);
    });

    it('should resolve value() usage in mixin call', function () {
        function mixin(options: string[]) {
            return {
                color: options[0],
            };
        }

        function otherMixin(options: string[]) {
            return {
                backgroundColor: options[0],
            };
        }

        function noParamsMixin() {
            return {
                borderColor: 'orange',
            };
        }

        const sheet = Stylesheet.fromCSS(`
            :import("./relative/path/to/mixin.js") {
                -sb-default: MyMixin;
            }
            :import("./relative/path/to/mixin.js") {
                -sb-default: OtherMixin;
            }
            :import("./relative/path/to/mixin.js") {
                -sb-default: NoParamsMixin;
            }
            :vars {
                param: red;
            }
            .container {
                -sb-mixin: MyMixin(value(param)) NoParamsMixin OtherMixin(blue);
            }
        `, "");

        const gen = new Generator({
            namespaceDivider: "__"
        });

        const stack: any = [];

        gen.prepareSelector(sheet, '.container', {
            MyMixin: mixin,
            OtherMixin: otherMixin,
            NoParamsMixin: noParamsMixin,
        }, stack);

        expect(stack[0]).to.eql({
            selector: '.container',
            rules: {
                color: "red",
            }
        });

        expect(stack[1]).to.eql({
            selector: '.container',
            rules: {
                borderColor: "orange",
            }
        });

        expect(stack[2]).to.eql({
            selector: '.container',
            rules: {
                backgroundColor: "blue",
            }
        });
    });
});
