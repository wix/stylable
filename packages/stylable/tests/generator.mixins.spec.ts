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

        gen.prepareSelector(sheet, '.container', {
            MyMixin: mixin
        }, []);

        expect(sheet.cssDefinition[".container :hover"]).to.eql({
            color: "red"
        });

    });

});
