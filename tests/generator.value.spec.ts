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
        }).to.throw('Unresolveable variable');

    });

});
