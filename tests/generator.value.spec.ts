import { fromCSS } from "../src";
import { Generator } from '../src/generator';
import { Resolver } from '../src/resolver';
import { Stylesheet } from '../src/stylesheet';
import { expect } from "chai";
import { defineStylableEnv, CSS, JS } from "./stylable-test-kit";


describe('Generator variables interpolation', function () {
    it('should not output :vars selector', function () {


        const sheet = fromCSS(`
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


        const sheet = fromCSS(`
            :vars {
                param: red;
            }
            .container { 
                color: value(param);
            }
        `, "''");

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

        const sheet = fromCSS(`
            :vars {
                param2: red;
                param: value(param2);
            }
            .container { 
                color: value(param);
            }
        `, "''");

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

        const sheet = fromCSS(`
            :vars {
                param2: value(param1);
                param: value(param2);
            }
            .container { 
                color: value(param);
            }
        `, "''");
        
        expect(function(){
            Generator.generate([sheet], new Generator({}));
        }).to.throw('Unresolvable variable');

    });

    it('should support default value', function () {
        const sheet = fromCSS(`
            :vars {
                param: red;
                param2: blue
            }
            .container {
                border: 1px solid value(param, blue);
                color: value(param3, green);
                background-color: value(param3, param2);
            }
        `, "''");

        const css = Generator.generate([sheet], new Generator({
            namespaceDivider: "__"
        }));

        const res = [
            '.container {\n    border: 1px solid red;\n    color: green;\n    background-color: blue\n}'
        ];

        css.forEach((chunk, index) => expect(chunk).to.eql(res[index]));
        expect(css.length).to.equal(res.length);
    });

    it('should support imported vars', function () {
        const importedModule = new Stylesheet({
            ":vars": {
                "param1": "red",
                "param2": "blue",
            }
        });
        const sheet = fromCSS(`
            :import('./path') {
                -st-named: param1, param2;
            }
            :vars {
                param: value(param1);
            }
            .container {
                color: value(param);
                background-color: value(param2)
            }
            `, "''");

        const css = Generator.generate(sheet, new Generator({
            namespaceDivider: "__",
            resolver: new Resolver({
                "./path": importedModule,
            })
        }));

        expect(css).to.eql([
            '.container {\n    color: red;\n    background-color: blue\n}'
        ]);
    });

    it('should resolve value() usage in mixin call', function () {
        const env = defineStylableEnv([
            JS('./mixins.js', 'Mixins', {
                mixin(options: string[]) {
                    return {
                        color: options[0],
                    };
                },
                otherMixin(options: string[]) {
                    return {
                        backgroundColor: options[0],
                    };
                },
                noParamsMixin() {
                    return {
                        borderColor: 'orange',
                    };
                }
            }),
            CSS('./main.css', 'Main', `
                :import("./mixins.js") {
                    -st-named: mixin, otherMixin, noParamsMixin;
                }
                :vars {
                    param: red;
                }
                .container {
                    -st-mixin: mixin(value(param)) noParamsMixin otherMixin(blue);
                }
            `)
        ], {});
       
        env.validate.output([
            '.Main__container {\n    background-color: blue\n}',
            '.Main__container {\n    border-color: orange\n}',
            '.Main__container {\n    color: red/*param*/\n}'
        ]); // ToDo: fix order and combine into a single CSS ruleset
    });
});
