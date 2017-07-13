import { Generator } from '../src/generator';
import { Resolver } from '../src/resolver';
import { Stylesheet } from '../src/stylesheet';
import { expect } from "chai";


describe('static Generator.generate', function () {

    describe('generate() - raw css string from entry', function () {

        it('accepts single stylesheet as input', function () {

            const sheet = Stylesheet.fromCSS(`
                .container {
                    color: black;
                }
            `, "''");

            const css = Generator.generate(sheet);

            expect(css).to.eql(['.container {\n    color: black\n}']);

        });

        it('includes empty selectors', function () {

            const sheet = Stylesheet.fromCSS(`
                .container {}
                .image {}
            `, "''");

            const css = Generator.generate(sheet);

            expect(css).to.eql([".container {}", ".image {}"]);

        });

        it('css from multiple sheets', function () {

            const sheetA = Stylesheet.fromCSS(`
                .container {
                    color: black;
                }
            `, "''");

            const sheetB = Stylesheet.fromCSS(`
                .container {
                    color: white;
                }
            `, "''");

            const css = Generator.generate([sheetA, sheetB]);

            expect(css).to.eql([
                '.container {\n    color: black\n}',
                '.container {\n    color: white\n}',
            ]);

        });

        it('scope class selectors', function () {

            const sheet = Stylesheet.fromCSS(`
                .container {
                    color: white;
                }
            `, "TheNameSpace");

            const css = Generator.generate(sheet, new Generator({ namespaceDivider: "__THE_DIVIDER__" }));

            expect(css).to.eql([
                '.TheNameSpace__THE_DIVIDER__container {\n    color: white\n}'
            ]);

        });

        it('do not output :import', function () {

            const sheet = Stylesheet.fromCSS(`
                :import("./relative/path/to/sheetA.stylable.css"){
                    -sb-default: ContainerA;
                }
                :import("./relative/path/to/sheetB.stylable.css"){
                    -sb-default: ContainerB;
                }
                .container {
                    color: white;
                }
            `, "TheNameSpace");

            const css = Generator.generate(sheet, new Generator({
                namespaceDivider: "__THE_DIVIDER__",
                resolver: new Resolver({
                    "./relative/path/to/sheetA.stylable.css": new Stylesheet({}),
                    "./relative/path/to/sheetB.stylable.css": new Stylesheet({})
                })
            }));

            expect(css).to.eql([
                '.TheNameSpace__THE_DIVIDER__container {\n    color: white\n}'
            ]);

        });

        it('append imports to the output', function () {

            const sheetA = Stylesheet.fromCSS(`
                .containerA {
                    -sb-root: true;
                }
            `, "TheNameSpace");

            const sheetB = Stylesheet.fromCSS(`
                :import("./relative/path/to/sheetA.stylable.css"){}
                .containerB {
                    -sb-root: true;
                }
            `, "TheGreatNameSpace");
        
            const css = Generator.generate([sheetB], new Generator({
                namespaceDivider: "__THE_DIVIDER__",
                resolver: new Resolver({
                    "./relative/path/to/sheetA.stylable.css": sheetA
                })
            }));

            const res = [
                '.TheNameSpace__THE_DIVIDER__containerA {}',
                '.TheGreatNameSpace__THE_DIVIDER__containerB {}',
            ];

            css.forEach((chunk, index) => expect(chunk).to.eql(res[index]));
            expect(css.length).to.equal(res.length);
        });

        it('scoped typed selector that extends root', function () {

            const sheetA = Stylesheet.fromCSS(``, "TheNameSpace");

            const sheetB = Stylesheet.fromCSS(`
                :import("./relative/path/to/sheetA.stylable.css"){
                     -sb-default: Container;
                }
                .containerB {
                    -sb-type: Container;
                }
            `, "TheGreatNameSpace");

            const css = Generator.generate([sheetB], new Generator({
                namespaceDivider: "__THE_DIVIDER__",
                resolver: new Resolver({
                    "./relative/path/to/sheetA.stylable.css": sheetA
                })
            }));

            const res = [
                '.TheGreatNameSpace__THE_DIVIDER__containerB.TheNameSpace__THE_DIVIDER__root {}',
            ];

            css.forEach((chunk, index) => expect(chunk).to.eql(res[index]));
            expect(css.length).to.equal(res.length);
        });

        it('component/tag typed selector that extends root', function () {

            const sheetA = Stylesheet.fromCSS(``, "TheNameSpace");

            const sheetB = Stylesheet.fromCSS(`
                :import("./relative/path/to/sheetA.stylable.css"){
                     -sb-default: Container;
                }                
                container {
                    -sb-type: Container;
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

            css.forEach((chunk, index) => expect(chunk).to.eql(res[index]));
            expect(css.length).to.equal(res.length);
        });

        it('component/tag typed selector that extends root with inner class targeting', function () {

            const sheetA = Stylesheet.fromCSS(`
                .inner { }
            `, "TheNameSpace");

            const sheetB = Stylesheet.fromCSS(`
                :import("./relative/path/to/sheetA.stylable.css"){
                     -sb-default: Container;
                }                
                container {
                    -sb-type: Container;
                }
                container::inner {
                    
                }
            `, "TheGreatNameSpace");

            const css = Generator.generate([sheetB], new Generator({
                namespaceDivider: "__THE_DIVIDER__",
                resolver: new Resolver({
                    "./relative/path/to/sheetA.stylable.css": sheetA
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

        it('resolve and transform pseudo-element from imported type', function () {

            const sheetA = Stylesheet.fromCSS(`
                .containerA {
                    
                }
                .icon { }
            `, "TheNameSpace");

            const sheetB = Stylesheet.fromCSS(`
                :import("./relative/path/to/sheetA.stylable.css"){
                    -sb-default: Container;
                }
                .containerB {
                    -sb-type: Container;
                }
                .containerB::icon { }
            `, "TheGreatNameSpace");

            const css = Generator.generate([sheetB], new Generator({
                namespaceDivider: "__THE_DIVIDER__",
                resolver: new Resolver({
                    "./relative/path/to/sheetA.stylable.css": sheetA
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

        it('resolve and transform pseudo-element from deeply imported type', function () {

            const Text = Stylesheet.fromCSS(`
                .first-letter { }
            `, "Text");

            const Button = Stylesheet.fromCSS(`
                :import("./Text.stylable.css"){
                    -sb-default: Text;
                }
                .button { }
                .text { -sb-type: Text; }
            `, "Button");

            const App = Stylesheet.fromCSS(`
                :import("./Button.stylable.css"){
                    -sb-default: Button;
                }
                .app {
                    -sb-type: Button;
                }
                .app::text::first-letter { }
            `, "App");

            const css = Generator.generate([App], new Generator({
                namespaceDivider: "__",
                resolver: new Resolver({
                    "./Text.stylable.css": Text,
                    "./Button.stylable.css": Button
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

        it('resolve and transform pseudo-element from deeply imported type (selector with , separator)', function () {

            const Text = Stylesheet.fromCSS(`
                .first-letter { }
            `, "Text");

            const Button = Stylesheet.fromCSS(`
                :import("./Text.stylable.css"){
                    -sb-default: Text;
                }
                .button { }
                .text { -sb-type: Text; }
            `, "Button");

            const App = Stylesheet.fromCSS(`
                :import("./Button.stylable.css"){
                    -sb-default: Button;
                }
                .app {
                    -sb-type: Button;
                }
                .app::text::first-letter, .gallery { }
            `, "App");

            const css = Generator.generate([App], new Generator({
                namespaceDivider: "__",
                resolver: new Resolver({
                    "./Text.stylable.css": Text,
                    "./Button.stylable.css": Button
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

        it('custom states inline', function () {

            const sheet = Stylesheet.fromCSS(`
                .my-class { 
                    -sb-states: my-state;
                }
                .my-class:my-state {}
            `, "Style");

            const css = Generator.generate([sheet], new Generator({
                namespaceDivider: "__"
            }));

            const res = [
                '.Style__my-class {}',
                '.Style__my-class[data-style-my-state] {}',
            ];

            css.forEach((chunk, index) => expect(chunk).to.eql(res[index]));
            expect(css.length).to.equal(res.length);
        });


        it('custom states from imported type', function () {
            const sheetA = Stylesheet.fromCSS(`
                .root { 
                    -sb-states: my-state;
                }
            `, "StyleA");

            const sheetB = Stylesheet.fromCSS(`
                :import("./relative/path/to/sheetA.stylable.css"){
                    -sb-default: SheetA;
                }
                .my-class { 
                    -sb-type: SheetA;
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
                '.StyleB__my-class.StyleA__root[data-stylea-my-state] {}',
            ];

            css.forEach((chunk, index) => expect(chunk).to.eql(res[index]));
            expect(css.length).to.equal(res.length);
        });


        it('custom states lookup order', function () {
            const sheetA = Stylesheet.fromCSS(`
                .root { 
                    -sb-states: my-state;
                }
            `, "StyleA");

            const sheetB = Stylesheet.fromCSS(`
                :import("./relative/path/to/sheetA.stylable.css"){
                    -sb-default: SheetA;
                }
                .my-class { 
                    -sb-states: my-state;
                    -sb-type: SheetA;
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

            css.forEach((chunk, index) => expect(chunk).to.eql(res[index]));
            expect(css.length).to.equal(res.length);
        });



        it('custom states form imported type on inner pseudo-class', function () {
            const sheetA = Stylesheet.fromCSS(`
                .container { 
                    -sb-states: my-state;
                }
            `, "StyleA");

            const sheetB = Stylesheet.fromCSS(`
                :import("./relative/path/to/sheetA.stylable.css"){
                    -sb-default: SheetA;
                }
                .my-class { 
                    -sb-type: SheetA;
                }
                .my-class::container:my-state {}
            `, "StyleB");

            const css = Generator.generate([sheetB], new Generator({
                namespaceDivider: "__",
                resolver: new Resolver({
                    "./relative/path/to/sheetA.stylable.css": sheetA
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

        it('supports multiple appearances of the same css rule', function () {
            const sheet = Stylesheet.fromCSS(`
                .container {
                    color: black;
                    color: red;
                }
            `, "''");

            const css = Generator.generate(sheet);

            expect(css).to.eql(['.container {\n    color: red\n}']);

        });
    });

    describe('classes rewrite', function(){

        it('should update the scoped classnames on the stylesheet', function(){
            const sheet = Stylesheet.fromCSS(`
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

        
        it('should update the scoped classnames on depended stylesheet', function(){
                       
            const sheetA = Stylesheet.fromCSS(`
                .container {
                    color: black;
                    color: red;
                }
            `, "sheetA");
            
            const sheetB = Stylesheet.fromCSS(`
                :import("./relative/path/to/sheetA.stylable.css"){
                    -sb-default: SheetA;
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

        
        it('should update root classname evan if there is no root defined', function(){
            const sheet = Stylesheet.fromCSS(``, "Sheet");

            Generator.generate(sheet, new Generator({
                namespaceDivider: "__"
            }));

            expect(sheet.classes['root']).to.equal('Sheet__root');
        });

    });

    describe('global', function(){
        it('should not scope global selectors and remove :global', function () {
            const sheet = Stylesheet.fromCSS(`
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

            css.forEach((chunk, index) => expect(chunk).to.eql(res[index]));
            expect(css.length).to.equal(res.length);
        });

        it('should work with other chunks after', function () {
            const sheet = Stylesheet.fromCSS(`
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

            css.forEach((chunk, index) => expect(chunk).to.eql(res[index]));
            expect(css.length).to.equal(res.length);
        });
        
        it('should work with multiple selectors inline', function () {
            const sheet = Stylesheet.fromCSS(`
                :global(.container),.container {
                    color: red;
                }
            `, 'Style');

            const css = Generator.generate([sheet], new Generator({
                namespaceDivider: "__"
            }));

            const res = [
                '.container,.Style__container {\n    color: red\n}'
            ];

            css.forEach((chunk, index) => expect(chunk).to.eql(res[index]));
            expect(css.length).to.equal(res.length);
        });
    })

});
