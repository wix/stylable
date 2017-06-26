import { Generator } from '../src/generator';
import { Resolver } from '../src/resolver';
import { styleable } from '../src/styleable';
import { Stylesheet } from '../src/stylesheet';
import { expect } from "chai";


describe('styleable', function () {

    describe('generate', function () {

        it('include empty selectors', function () {

            var sheet = Stylesheet.fromCSS(`
                .container {}
                .image {}
            `);

            const css = styleable.generate(sheet);

            expect(css).to.eql([".container {}", ".image {}"]);

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

            const css = styleable.generate(sheet, new Generator({ namespaceDivider: "__THE_DIVIDER__" }));

            expect(css).to.eql([
                '.TheNameSpace__THE_DIVIDER__container {\n    color: white\n}'
            ]);

        });

        it('generate do not output :import', function () {

            var sheet = Stylesheet.fromCSS(`
                :import("./relative/path/to/sheetA.styleable.css"){
                    -sb-default: ContainerA;
                }
                :import("./relative/path/to/sheetB.styleable.css"){
                    -sb-default: ContainerB;
                }
                .container {
                    color: white;
                }
            `, "TheNameSpace");

            const css = styleable.generate(sheet, new Generator({ 
                namespaceDivider: "__THE_DIVIDER__",
                resolver: new Resolver({
                    "./relative/path/to/sheetA.styleable.css": new Stylesheet({}),
                    "./relative/path/to/sheetB.styleable.css": new Stylesheet({})
                })
            }));

            expect(css).to.eql([
                '.TheNameSpace__THE_DIVIDER__container {\n    color: white\n}'
            ]);

        });

        it('generate append imports to the output', function () {

            var sheetA = Stylesheet.fromCSS(`
                .containerA {
                    -sb-root: true;
                }
            `, "TheNameSpace");

            var sheetB = Stylesheet.fromCSS(`
                :import("./relative/path/to/sheetA.styleable.css"){}
                .containerB {
                    -sb-root: true;
                }
            `, "TheGreatNameSpace");

            const css = styleable.generate([sheetB], new Generator({
                namespaceDivider: "__THE_DIVIDER__",
                resolver: new Resolver({
                    "./relative/path/to/sheetA.styleable.css": sheetA
                })
            }));

            const res = [
                '.TheNameSpace__THE_DIVIDER__containerA {}',
                '.TheGreatNameSpace__THE_DIVIDER__containerB {}',
            ];

            css.forEach((chunk, index) => expect(chunk).to.eql(res[index]));
            expect(css.length).to.equal(res.length);
        });
        
        it('generate scoped typed selector that extends root', function () {

            var sheetA = Stylesheet.fromCSS(``, "TheNameSpace");

            var sheetB = Stylesheet.fromCSS(`
                :import("./relative/path/to/sheetA.styleable.css"){
                     -sb-default: Container;
                }
                .containerB {
                    -sb-type: Container;
                }
            `, "TheGreatNameSpace");

            const css = styleable.generate([sheetB], new Generator({
                namespaceDivider: "__THE_DIVIDER__",
                resolver: new Resolver({
                    "./relative/path/to/sheetA.styleable.css": sheetA
                })
            }));

            const res = [
                '.TheGreatNameSpace__THE_DIVIDER__containerB.TheNameSpace__THE_DIVIDER__root {}',
            ];

            css.forEach((chunk, index) => expect(chunk).to.eql(res[index]));
            expect(css.length).to.equal(res.length);
        });
                
        it('generate component/tag typed selector that extends root', function () {

            var sheetA = Stylesheet.fromCSS(``, "TheNameSpace");

            var sheetB = Stylesheet.fromCSS(`
                :import("./relative/path/to/sheetA.styleable.css"){
                     -sb-default: Container;
                }                
                container {
                    -sb-type: Container;
                }
            `, "TheGreatNameSpace");

            const css = styleable.generate([sheetB], new Generator({
                namespaceDivider: "__THE_DIVIDER__",
                resolver: new Resolver({
                    "./relative/path/to/sheetA.styleable.css": sheetA
                })
            }));

            const res = [
                '.TheGreatNameSpace__THE_DIVIDER__root .TheNameSpace__THE_DIVIDER__root {}',
            ];

            css.forEach((chunk, index) => expect(chunk).to.eql(res[index]));
            expect(css.length).to.equal(res.length);
        });

        it('generate component/tag typed selector that extends root with inner class targeting', function () {

            var sheetA = Stylesheet.fromCSS(`
                .inner { }
            `, "TheNameSpace");

            var sheetB = Stylesheet.fromCSS(`
                :import("./relative/path/to/sheetA.styleable.css"){
                     -sb-default: Container;
                }                
                container {
                    -sb-type: Container;
                }
                container::inner {
                    
                }
            `, "TheGreatNameSpace");

            const css = styleable.generate([sheetB], new Generator({
                namespaceDivider: "__THE_DIVIDER__",
                resolver: new Resolver({
                    "./relative/path/to/sheetA.styleable.css": sheetA
                })
            }));

            const res = [
                '.TheNameSpace__THE_DIVIDER__inner {}',
                '.TheGreatNameSpace__THE_DIVIDER__root .TheNameSpace__THE_DIVIDER__root {}',
                '.TheGreatNameSpace__THE_DIVIDER__root .TheNameSpace__THE_DIVIDER__root .TheNameSpace__THE_DIVIDER__inner {}'
            ];

            css.forEach((chunk, index) => expect(chunk).to.eql(res[index]));
            expect(css.length).to.equal(res.length);
        });

        it('generate resolve and transform pseudo-element from imported type', function () {

            var sheetA = Stylesheet.fromCSS(`
                .containerA {
                    
                }
                .icon { }
            `, "TheNameSpace");

            var sheetB = Stylesheet.fromCSS(`
                :import("./relative/path/to/sheetA.styleable.css"){
                    -sb-default: Container;
                }
                .containerB {
                    -sb-type: Container;
                }
                .containerB::icon { }
            `, "TheGreatNameSpace");

            const css = styleable.generate([sheetB], new Generator({
                namespaceDivider: "__THE_DIVIDER__",
                resolver: new Resolver({
                    "./relative/path/to/sheetA.styleable.css": sheetA
                })
            }));

            const res = [
                '.TheNameSpace__THE_DIVIDER__containerA {}',
                '.TheNameSpace__THE_DIVIDER__icon {}',
                '.TheGreatNameSpace__THE_DIVIDER__containerB.TheNameSpace__THE_DIVIDER__root {}',
                '.TheGreatNameSpace__THE_DIVIDER__containerB.TheNameSpace__THE_DIVIDER__root .TheNameSpace__THE_DIVIDER__icon {}'
            ];

            css.forEach((chunk, index) => expect(chunk).to.eql(res[index]));
            expect(css.length).to.equal(res.length);
        });
       
        it('generate resolve and transform pseudo-element from deeply imported type', function () {

            var Text = Stylesheet.fromCSS(`
                .first-letter { }
            `, "Text");

            var Button = Stylesheet.fromCSS(`
                :import("./Text.styleable.css"){
                    -sb-default: Text;
                }
                .button { }
                .text { -sb-type: Text; }
            `, "Button");

            var App = Stylesheet.fromCSS(`
                :import("./Button.styleable.css"){
                    -sb-default: Button;
                }
                .app {
                    -sb-type: Button;
                }
                .app::text::first-letter { }
            `, "App");

            const css = styleable.generate([App], new Generator({
                namespaceDivider: "__",
                resolver: new Resolver({
                    "./Text.styleable.css": Text,
                    "./Button.styleable.css": Button
                })
            }));

            const res = [
                '.Text__first-letter {}',
                '.Button__button {}',
                '.Button__text.Text__root {}',
                '.App__app.Button__root {}',
                '.App__app.Button__root .Button__text .Text__first-letter {}'
            ];

            css.forEach((chunk, index) => expect(chunk).to.eql(res[index]));
            expect(css.length).to.equal(res.length);
        });
        
        it('generate resolve and transform pseudo-element from deeply imported type (selector with , separator)', function () {

            var Text = Stylesheet.fromCSS(`
                .first-letter { }
            `, "Text");

            var Button = Stylesheet.fromCSS(`
                :import("./Text.styleable.css"){
                    -sb-default: Text;
                }
                .button { }
                .text { -sb-type: Text; }
            `, "Button");

            var App = Stylesheet.fromCSS(`
                :import("./Button.styleable.css"){
                    -sb-default: Button;
                }
                .app {
                    -sb-type: Button;
                }
                .app::text::first-letter, .gallery { }
            `, "App");

            const css = styleable.generate([App], new Generator({
                namespaceDivider: "__",
                resolver: new Resolver({
                    "./Text.styleable.css": Text,
                    "./Button.styleable.css": Button
                })
            }));

            const res = [
                '.Text__first-letter {}',
                '.Button__button {}',
                '.Button__text.Text__root {}',
                '.App__app.Button__root {}',
                '.App__app.Button__root .Button__text .Text__first-letter, .App__gallery {}'
            ];

            css.forEach((chunk, index) => expect(chunk).to.eql(res[index]));
            expect(css.length).to.equal(res.length);
        });
        
        it('generate transform custom states inline', function () {

            var sheet = Stylesheet.fromCSS(`
                .my-class { 
                    -sb-states: my-state;
                }
                .my-class:my-state {}
            `, "Style");

            const css = styleable.generate([sheet], new Generator({
                namespaceDivider: "__"
            }));

            const res = [
                '.Style__my-class {}',
                '.Style__my-class[data-style-my-state] {}',
            ];

            css.forEach((chunk, index) => expect(chunk).to.eql(res[index]));
            expect(css.length).to.equal(res.length);
        });

        
        it('generate transform custom states on inner pseudo-class', function () {
            var sheetA = Stylesheet.fromCSS(`
                .container { 
                    -sb-states: my-state;
                }
            `, "StyleA");

            var sheetB = Stylesheet.fromCSS(`
                :import("./relative/path/to/sheetA.styleable.css"){
                    -sb-default: SheetA;
                }
                .my-class { 
                    -sb-type: SheetA;
                }
                .my-class::container:my-state {}
            `, "StyleB");

            const css = styleable.generate([sheetB], new Generator({
                namespaceDivider: "__",
                resolver: new Resolver({
                    "./relative/path/to/sheetA.styleable.css": sheetA
                })
            }));

            const res = [
                '.StyleA__container {}',
                '.StyleB__my-class.StyleA__root {}',
                '.StyleB__my-class.StyleA__root .StyleA__container[data-stylea-my-state] {}',
            ];

            css.forEach((chunk, index) => expect(chunk).to.eql(res[index]));
            expect(css.length).to.equal(res.length);
        });

        
        it('generate transform custom states on inner pseudo-class', function () {
            var sheetA = Stylesheet.fromCSS(`
                .container { 
                    -sb-states: my-state;
                }
            `, "StyleA");

            var sheetB = Stylesheet.fromCSS(`
                :import("./relative/path/to/sheetA.styleable.css"){
                    -sb-default: SheetA;
                }
                .my-class { 
                    -sb-type: SheetA;
                }
                .my-class::container:my-state {}
            `, "StyleB");

            const css = styleable.generate([sheetB], new Generator({
                namespaceDivider: "__",
                resolver: new Resolver({
                    "./relative/path/to/sheetA.styleable.css": sheetA
                })
            }));

            const res = [
                '.StyleA__container {}',
                '.StyleB__my-class.StyleA__root {}',
                '.StyleB__my-class.StyleA__root .StyleA__container[data-stylea-my-state] {}',
            ];

            css.forEach((chunk, index) => expect(chunk).to.eql(res[index]));
            expect(css.length).to.equal(res.length);
        });

    });

});
