import { fromCSS } from "../../src";
import { Generator } from '../../src/generator';
import { Resolver } from '../../src/resolver';
import { Stylesheet } from '../../src/stylesheet';
import { matchCSSMatchers } from "../matchers/match-css";
import * as chai from "chai";


const expect = chai.expect;

chai.use(matchCSSMatchers);


describe('postcss generate compt', function () {

    describe('generate() - raw css string from entry', function () {

        describe('2nd look!!!', function () {
            it('component/tag selector with first Capital letter automatically extend reference with identical name', function () {

                const sheetA = fromCSS(``, "TheNameSpace");

                const sheetB = fromCSS(`
                :import {
                    -st-from: "./relative/path/to/sheetA.stylable.css";
                    -st-default: Container;
                } 
                :import {
                    -st-from: "./relative/path/to/sheetA-re-exported.js";
                    -st-named: NamedContainer;
                }                 
                Container { color:red; }
                NamedContainer { color: green; }
            `, "TheGreatNameSpace");

                const css = Generator.generate([sheetB], new Generator({
                    namespaceDivider: "__THE_DIVIDER__",
                    resolver: new Resolver({
                        "./relative/path/to/sheetA.stylable.css": sheetA,
                        './relative/path/to/sheetA-re-exported.js': { NamedContainer: sheetA }
                    })
                }));

                const res = [
                    '.TheGreatNameSpace__THE_DIVIDER__root .TheNameSpace__THE_DIVIDER__root {\n    color: red\n}',
                    '.TheGreatNameSpace__THE_DIVIDER__root .TheNameSpace__THE_DIVIDER__root {\n    color: green\n}'
                ];

                css.forEach((chunk, index) => expect(chunk).to.matchCSS(res[index]));
                expect(css.length).to.equal(res.length);
            });

            it('component/tag selector from named import with pseudo-elements', function () {
                const sheetA = fromCSS(`
                .x{}
            `, "TheNameSpace");

                const sheetB = fromCSS(`
                :import {
                    -st-from: "./relative/path/to/sheetA-re-exported.js";
                    -st-named: NamedContainer;
                }                 
                NamedContainer::x { color: gold; }
            `, "TheGreatNameSpace");

                const css = Generator.generate([sheetB], new Generator({
                    namespaceDivider: "__THE_DIVIDER__",
                    resolver: new Resolver({
                        './relative/path/to/sheetA-re-exported.js': { NamedContainer: sheetA }
                    })
                }));

                const res = [
                    '.TheNameSpace__THE_DIVIDER__x {}',
                    '.TheGreatNameSpace__THE_DIVIDER__root .TheNameSpace__THE_DIVIDER__root .TheNameSpace__THE_DIVIDER__x {\n    color: gold\n}'
                ];

                css.forEach((chunk, index) => expect(chunk).to.matchCSS(res[index]));
                expect(css.length).to.equal(res.length);
            });



            it('component/tag selector with first Capital letter is overridden with -st-extends', function () {

                const sheetA = fromCSS(``, "SheetA");
                const sheetB = fromCSS(``, "SheetB");

                const entrySheet = fromCSS(`
                :import("./relative/path/to/sheetA.stylable.css"){
                    -st-default: SheetA;
                }  
                :import("./relative/path/to/sheetB.stylable.css"){
                    -st-default: SheetB;
                }                 
                SheetB {
                    -st-extends: SheetA;
                }
            `, "TheGreatNameSpace");

                const css = Generator.generate([entrySheet], new Generator({
                    namespaceDivider: "__THE_DIVIDER__",
                    resolver: new Resolver({
                        "./relative/path/to/sheetA.stylable.css": sheetA,
                        "./relative/path/to/sheetB.stylable.css": sheetB
                    })
                }));

                const res = [
                    '.TheGreatNameSpace__THE_DIVIDER__root .SheetA__THE_DIVIDER__root {}',
                ];

                css.forEach((chunk, index) => expect(chunk).to.matchCSS(res[index]));
                expect(css.length).to.equal(res.length);
            });

            it('component/tag selector that extends another stylesheet', function () {

                const sheetA = fromCSS(``, "TheNameSpace");

                const sheetB = fromCSS(`
                :import("./relative/path/to/sheetA.stylable.css"){
                     -st-default: Container;
                }                
                container {
                    -st-extends: Container;
                }
            `, "TheGreatNameSpace");

                const css = Generator.generate([sheetB], new Generator({
                    namespaceDivider: "__THE_DIVIDER__",
                    resolver: new Resolver({
                        "./relative/path/to/sheetA.stylable.css": sheetA
                    })
                }));

                const res = [
                    '.TheGreatNameSpace__THE_DIVIDER__root .TheNameSpace__THE_DIVIDER__root {}',
                ];

                css.forEach((chunk, index) => expect(chunk).to.matchCSS(res[index]));
                expect(css.length).to.equal(res.length);
            });

            it('supports multiple appearances of the same css rule', function () {
                const sheet = fromCSS(`
                    .container {
                            color: black;
                            color: red;
                        }
                    `, "''");

                const css = Generator.generate(sheet);

                expect(css[0]).to.equal('.container {\n    color: black;\n    color: red\n}');

            });
            
            it('custom states with mapping with space around', function () {

                const sheet = fromCSS(`
                    .my-class { 
                        -st-states: my-state(" .x .y"), my-other-state(" .y[data-z=\"val\"] ");
                    }
                    .my-class:my-state {} 
                    .my-class:my-other-state {}
                `, "Style");

                const css = Generator.generate([sheet], new Generator({
                    namespaceDivider: "__"
                }));

                const res = [
                    '.Style__my-class {}',
                    '.Style__my-class.x {}',
                    '.Style__my-class.y[data-z="val"] {}'
                ];

                css.forEach((chunk, index) => expect(chunk).to.matchCSS(res[index]));
                expect(css.length).to.equal(res.length);
            });
        })

        it('custom states lookup order', function () {
            const sheetA = fromCSS(`
                .root { 
                    -st-states: my-state;
                }
            `, "StyleA");

            const sheetB = fromCSS(`
                :import("./relative/path/to/sheetA.stylable.css"){
                    -st-default: SheetA;
                }
                .my-class { 
                    -st-states: my-state;
                    -st-extends: SheetA;
                }
                .my-class:my-state {}
            `, "StyleB");

            const css = Generator.generate([sheetB], new Generator({
                namespaceDivider: "__",
                resolver: new Resolver({
                    "./relative/path/to/sheetA.stylable.css": sheetA
                })
            }));

            const res = [
                '.StyleA__root {}',
                '.StyleB__my-class.StyleA__root {}',
                '.StyleB__my-class.StyleA__root[data-styleb-my-state] {}',
            ];

            css.forEach((chunk, index) => expect(chunk).to.matchCSS(res[index]));
            expect(css.length).to.equal(res.length);
        });

    })

    describe('classes rewrite', function () {

        it('should update the scoped classnames on the stylesheet', function () {
            const sheet = fromCSS(`
                .container {
                    color: black;
                    color: red;
                }
            `, "Sheet");

            Generator.generate(sheet, new Generator({
                namespaceDivider: "__"
            }));

            expect(sheet.classes['container']).to.equal('Sheet__container');
        });


        it('should update the scoped classnames on depended stylesheet', function () {

            const sheetA = fromCSS(`
                .container {
                    color: black;
                    color: red;
                }
            `, "sheetA");

            const sheetB = fromCSS(`
                :import("./relative/path/to/sheetA.stylable.css"){
                    -st-default: SheetA;
                }
                .container {
                    color: black;
                    color: red;
                }
            `, "sheetB");

            Generator.generate(sheetB, new Generator({
                namespaceDivider: "__",
                resolver: new Resolver({
                    "./relative/path/to/sheetA.stylable.css": sheetA
                })
            }));

            expect(sheetA.classes['container']).to.equal('sheetA__container');
            expect(sheetB.classes['container']).to.equal('sheetB__container');
        });


        it('should update root classname evan if there is no root defined', function () {
            const sheet = fromCSS(``, "Sheet");

            Generator.generate(sheet, new Generator({
                namespaceDivider: "__"
            }));

            expect(sheet.classes['root']).to.equal('Sheet__root');
        });

    })

    describe('global', function () {
        it('should not scope global selectors and remove :global', function () {
            const sheet = fromCSS(`
                .container {
                    color: black;
                }
                :global(.container) {
                    color: red;
                }
            `, 'Style');

            const css = Generator.generate([sheet], new Generator({
                namespaceDivider: "__"
            }));

            const res = [
                '.Style__container {\n    color: black\n}',
                '.container {\n    color: red\n}'
            ];

            css.forEach((chunk, index) => expect(chunk).to.matchCSS(res[index]));
            expect(css.length).to.equal(res.length);
        });

        it('should work with other chunks after', function () {
            const sheet = fromCSS(`
                :global(.container) .container {
                    color: red;
                }
            `, 'Style');

            const css = Generator.generate([sheet], new Generator({
                namespaceDivider: "__"
            }));

            const res = [
                '.container .Style__container {\n    color: red\n}'
            ];

            css.forEach((chunk, index) => expect(chunk).to.matchCSS(res[index]));
            expect(css.length).to.equal(res.length);
        });

        it('should work with multiple selectors inline', function () {
            const sheet = fromCSS(`
                :global(.container), .container {
                    color: red;
                }
            `, 'Style');

            const css = Generator.generate([sheet], new Generator({
                namespaceDivider: "__"
            }));

            const res = [
                '.container, .Style__container {\n    color: red\n}'
            ];

            css.forEach((chunk, index) => expect(chunk).to.matchCSS(res[index]));
            expect(css.length).to.equal(res.length);
        });
    })


})
