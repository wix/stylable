import { fromCSS } from "../src";
import { Generator } from '../src/generator';
import { Resolver } from '../src/resolver';
import { Stylesheet } from '../src/stylesheet';
import * as chai from "chai";

const expect = chai.expect;

chai.use(matchCSSMatchers);

function matchCSSMatchers(chai: any, util: any) {
    const { flag } = util;
    chai.Assertion.addMethod('matchCSS', function (this: any, css: string | string[]) {
        let element = flag(this, 'object');
        if(!Array.isArray(css)){
            css = [css]
        }
        if(!Array.isArray(element)){
            element = [element]
        }     
        //TODO: better reporting.
        expect(element.length).to.equal(css.length);
        css.forEach((chunk, index) => expect(element[index]).to.eql(chunk));
    });
}


describe('static Generator.generate', function () {

    describe('generate() - raw css string from entry', function () {

        it('accepts single stylesheet as input', function () {

            const sheet = fromCSS(`
                .container {
                    color: black;
                }
            `, "''");

            const css = Generator.generate(sheet);

            expect(css).to.matchCSS(['.container {\n    color: black\n}']);

        });

        it('includes empty selectors', function () {

            const sheet = fromCSS(`
                .container {}
                .image {}
            `, "''");

            const css = Generator.generate(sheet);

            expect(css).to.matchCSS([".container {}", ".image {}"]);

        });

        it('css from multiple sheets', function () {

            const sheetA = fromCSS(`
                .container {
                    color: black;
                }
            `, "''");

            const sheetB = fromCSS(`
                .container {
                    color: white;
                }
            `, "''");

            const css = Generator.generate([sheetA, sheetB]);

            expect(css).to.matchCSS([
                '.container {\n    color: black\n}',
                '.container {\n    color: white\n}',
            ]);

        });

        it('scope class selectors', function () {

            const sheet = fromCSS(`
                .container {
                    color: white;
                }
            `, "TheNameSpace");

            const css = Generator.generate(sheet, new Generator({ namespaceDivider: "__THE_DIVIDER__" }));

            expect(css).to.matchCSS([
                '.TheNameSpace__THE_DIVIDER__container {\n    color: white\n}'
            ]);

        });

        it('do not output :import', function () {

            const sheet = fromCSS(`
                :import{
                    -st-from: "./relative/path/to/sheetA.stylable.css";
                    -st-default: ContainerA;
                }
                :import{
                    -st-from: "./relative/path/to/sheetB.stylable.css";
                    -st-default: ContainerB;
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

            expect(css).to.matchCSS([
                '.TheNameSpace__THE_DIVIDER__container {\n    color: white\n}'
            ]);

        });

        it('append imports to the output', function () {

            const sheetA = fromCSS(`
                .containerA {
                    -st-root: true;
                }
            `, "TheNameSpace");

            const sheetB = fromCSS(`
                :import("./relative/path/to/sheetA.stylable.css"){}
                .containerB {
                    -st-root: true;
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

            css.forEach((chunk, index) => expect(chunk).to.matchCSS(res[index]));
            expect(css.length).to.equal(res.length);
        });

        it('not append imports with unknown "from" to the output', function () {
            const sheetA = fromCSS(`
                :import{}
                .containerA{ color:red; }
            `, "TheNameSpace");

            const css = Generator.generate([sheetA], new Generator({
                namespaceDivider: "__THE_DIVIDER__",
                resolver: new Resolver({})
            }));

            const res = [
                '.TheNameSpace__THE_DIVIDER__containerA {\n    color: red\n}',
            ];

            css.forEach((chunk, index) => expect(chunk).to.matchCSS(res[index]));
            expect(css.length).to.equal(res.length);
        });

        it('scoped typed selector that extends root', function () {

            const sheetA = fromCSS(``, "TheNameSpace");

            const sheetB = fromCSS(`
                :import("./relative/path/to/sheetA.stylable.css"){
                     -st-default: Container;
                }
                .containerB {
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
                '.TheGreatNameSpace__THE_DIVIDER__containerB.TheNameSpace__THE_DIVIDER__root {}',
            ];

            css.forEach((chunk, index) => expect(chunk).to.matchCSS(res[index]));
            expect(css.length).to.equal(res.length);
        });

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
                    './relative/path/to/sheetA-re-exported.js': { NamedContainer:sheetA }
                })
            }));

            const res = [
                '.TheGreatNameSpace__THE_DIVIDER__root .TheNameSpace__THE_DIVIDER__root {\n    color: red\n}',
                '.TheGreatNameSpace__THE_DIVIDER__root .TheNameSpace__THE_DIVIDER__root {\n    color: green\n}'
            ];

            css.forEach((chunk, index) => expect(chunk).to.matchCSS(res[index]));
            expect(css.length).to.equal(res.length);
        });

        it('component/tag selector with first Capital letter automatically extend reference to named export', function () {
            
            const sheetA = fromCSS(``, "TheNameSpace");

            const sheetB = fromCSS(`
                :import {
                    -st-from: "./relative/path/to/sheetA-re-exported.js";
                    -st-named: NamedContainer as Container;
                }                 
                Container { color:red; }
            `, "TheGreatNameSpace");

            const css = Generator.generate([sheetB], new Generator({
                namespaceDivider: "__THE_DIVIDER__",
                resolver: new Resolver({
                    './relative/path/to/sheetA-re-exported.js': { NamedContainer:sheetA }
                })
            }));

            const res = [
                '.TheGreatNameSpace__THE_DIVIDER__root .TheNameSpace__THE_DIVIDER__root {\n    color: red\n}'
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
                    './relative/path/to/sheetA-re-exported.js': { NamedContainer:sheetA }
                })
            }));

            const res = [
                '.TheNameSpace__THE_DIVIDER__x {}',
                '.TheGreatNameSpace__THE_DIVIDER__root .TheNameSpace__THE_DIVIDER__root .TheNameSpace__THE_DIVIDER__x {\n    color: gold\n}'
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

        it('component/tag selector that extends root with inner class targeting', function () {

            const sheetA = fromCSS(`
                .inner { }
            `, "TheNameSpace");

            const sheetB = fromCSS(`
                :import("./relative/path/to/sheetA.stylable.css"){
                     -st-default: Container;
                }                
                container {
                    -st-extends: Container;
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

            css.forEach((chunk, index) => expect(chunk).to.matchCSS(res[index]));
            expect(css.length).to.equal(res.length);
        });

        it('resolve and transform pseudo-element from imported type', function () {

            const sheetA = fromCSS(`
                .containerA {
                    
                }
                .icon { }
            `, "TheNameSpace");

            const sheetB = fromCSS(`
                :import("./relative/path/to/sheetA.stylable.css"){
                    -st-default: Container;
                }
                .containerB {
                    -st-extends: Container;
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

            css.forEach((chunk, index) => expect(chunk).to.matchCSS(res[index]));
            expect(css.length).to.equal(res.length);
        });

        it('resolve and transform pseudo-element from deeply imported type', function () {

            const Text = fromCSS(`
                .first-letter { }
            `, "Text");

            const Button = fromCSS(`
                :import("./Text.stylable.css"){
                    -st-default: Text;
                }
                .button { }
                .text { -st-extends: Text; }
            `, "Button");

            const App = fromCSS(`
                :import("./Button.stylable.css"){
                    -st-default: Button;
                }
                .app {
                    -st-extends: Button;
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

            css.forEach((chunk, index) => expect(chunk).to.matchCSS(res[index]));
            expect(css.length).to.equal(res.length);
        });

        it('resolve and transform pseudo-element from deeply extended type', function () {
            
            const GenericGallery = fromCSS(`
                .nav-btn { }
            `, "GenericGallery");

            const ImageGallery = fromCSS(`
                :import("./generic-gallery.stylable.css"){
                    -st-default: GenericGallery;
                }
                .root { -st-extends: GenericGallery; }
            `, "ImageGallery");

            const App = fromCSS(`
                :import("./image-gallery.stylable.css"){
                    -st-default: ImageGallery;
                }
                .main-gallery {
                    -st-extends: ImageGallery;
                }
                .main-gallery::nav-btn { }
            `, "App");

            const css = Generator.generate([App], new Generator({
                namespaceDivider: "__",
                resolver: new Resolver({
                    "./generic-gallery.stylable.css": GenericGallery,
                    "./image-gallery.stylable.css": ImageGallery
                })
            }));

            const res = [
                '.GenericGallery__nav-btn {}',
                '.ImageGallery__root.GenericGallery__root {}', /* ToDo: check if GenericGallery__root is needed here */
                '.App__main-gallery.ImageGallery__root {}',
                '.App__main-gallery.ImageGallery__root .GenericGallery__nav-btn {}'
            ];

            css.forEach((chunk, index) => expect(chunk).to.matchCSS(res[index]));
            expect(css.length).to.equal(res.length);
        });

        it('resolve and transform pseudo-element from deeply override rather then extended type', function () {
            
            const GenericGallery = fromCSS(`
                .nav-btn { }
            `, "GenericGallery");

            const ImageGallery = fromCSS(`
                :import("./generic-gallery.stylable.css"){
                    -st-default: GenericGallery;
                }
                .root { -st-extends: GenericGallery; }
                .nav-btn { }
            `, "ImageGallery");

            const App = fromCSS(`
                :import("./image-gallery.stylable.css"){
                    -st-default: ImageGallery;
                }
                .main-gallery {
                    -st-extends: ImageGallery;
                }
                .main-gallery::nav-btn { }
            `, "App");

            const css = Generator.generate([App], new Generator({
                namespaceDivider: "__",
                resolver: new Resolver({
                    "./generic-gallery.stylable.css": GenericGallery,
                    "./image-gallery.stylable.css": ImageGallery
                })
            }));

            const res = [
                '.GenericGallery__nav-btn {}',
                '.ImageGallery__root.GenericGallery__root {}',
                '.ImageGallery__nav-btn {}', 
                '.App__main-gallery.ImageGallery__root {}',
                '.App__main-gallery.ImageGallery__root .ImageGallery__nav-btn {}'
            ];

            css.forEach((chunk, index) => expect(chunk).to.matchCSS(res[index]));
            expect(css.length).to.equal(res.length);
        });

        it('resolve and transform pseudo-element on root - prefer inherited element to override', function () {
            
            const GenericGallery = fromCSS(`
                .nav-btn { }
            `, "GenericGallery");

            const ImageGallery = fromCSS(`
                :import("./generic-gallery.stylable.css"){
                    -st-default: GenericGallery;
                }
                .root { -st-extends: GenericGallery; }
                .nav-btn { }
                .root::nav-btn { }
            `, "ImageGallery");

            const css = Generator.generate([ImageGallery], new Generator({
                namespaceDivider: "__",
                resolver: new Resolver({
                    "./generic-gallery.stylable.css": GenericGallery
                })
            }));

            const res = [
                '.GenericGallery__nav-btn {}',
                '.ImageGallery__root.GenericGallery__root {}',
                '.ImageGallery__nav-btn {}',
                '.ImageGallery__root.GenericGallery__root .GenericGallery__nav-btn {}' /* ToDo: check if GenericGallery__root is needed here (same just uglier) */
            ];

            css.forEach((chunk, index) => expect(chunk).to.matchCSS(res[index]));
            expect(css.length).to.equal(res.length);
        });

        it('resolve and transform pseudo-element from deeply imported type (selector with , separator)', function () {

            const Text = fromCSS(`
                .first-letter { }
            `, "Text");

            const Button = fromCSS(`
                :import("./Text.stylable.css"){
                    -st-default: Text;
                }
                .button { }
                .text { -st-extends: Text; }
            `, "Button");

            const App = fromCSS(`
                :import("./Button.stylable.css"){
                    -st-default: Button;
                }
                .app {
                    -st-extends: Button;
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

            css.forEach((chunk, index) => expect(chunk).to.matchCSS(res[index]));
            expect(css.length).to.equal(res.length);
        });

        it('custom states inline', function () {

            const sheet = fromCSS(`
                .my-class { 
                    -st-states: my-state;
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

            css.forEach((chunk, index) => expect(chunk).to.matchCSS(res[index]));
            expect(css.length).to.equal(res.length);
        });

        it('custom states with mapping', function () {
            
            const sheet = fromCSS(`
                .my-class { 
                    -st-states: my-state(".x"), my-other-state(".y[data-z=\"val\"]");
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

        it('custom states with mapping with space around', function () {
            
            const sheet = fromCSS(`
                .my-class { 
                    -st-states: my-state(" .x "), my-other-state(" .y[data-z=\"val\"] ");
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

        it('custom states from imported type', function () {
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
                '.StyleB__my-class.StyleA__root[data-stylea-my-state] {}',
            ];

            css.forEach((chunk, index) => expect(chunk).to.matchCSS(res[index]));
            expect(css.length).to.equal(res.length);
        });

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

        it('custom states form imported type on inner pseudo-class', function () {
            const sheetA = fromCSS(`
                .container { 
                    -st-states: my-state;
                }
            `, "StyleA");

            const sheetB = fromCSS(`
                :import("./relative/path/to/sheetA.stylable.css"){
                    -st-default: SheetA;
                }
                .my-class { 
                    -st-extends: SheetA;
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

    describe('@keyframes', function () {
        it('handle @keyframes rules', function () {          
            var sheet = new Stylesheet({
                "@keyframes name": {
                    from: {},
                    to: {}
                }
            }, 's0');
            
            const css = Generator.generate(sheet, new Generator({
                namespaceDivider: "__"
            }));
            
            const res = ["@keyframes s0__name {\n    from {}\n    to {}\n}"];
            
            css.forEach((chunk, index) => expect(chunk).to.matchCSS(res[index]));
            expect(css.length).to.equal(res.length);

        });

        it('scope animation and animation name', function () {
    
            var sheet = new Stylesheet({
                "@keyframes name": {
                    from: {},
                    to: {}
                },
                "@keyframes name2": {
                    from: {},
                    to: {}
                },
                ".selector": {
                    animation: '2s name infinite, 1s name2 infinite',
                    animationName: 'name'
                }
            }, 's0');
            
            const css = Generator.generate(sheet, new Generator({
                namespaceDivider: "__"
            }));

            const res = [
                "@keyframes s0__name {\n    from {}\n    to {}\n}",
                "@keyframes s0__name2 {\n    from {}\n    to {}\n}",
                ".s0__selector {\n    animation: 2s s0__name infinite, 1s s0__name2 infinite;\n    animation-name: s0__name\n}"
            ];
            
            css.forEach((chunk, index) => expect(chunk).to.matchCSS(res[index]));
            expect(css.length).to.equal(res.length);

        })
    })
    
    describe('@media', function () {
        it('handle @media rules', function () {
            var sheet = new Stylesheet({
                "@media (max-width: 300px)": {
                    ".container": {}
                }
            }, 's0');
            
            const css = Generator.generate(sheet, new Generator({
                namespaceDivider: "__"
            }));
            const res = ['@media (max-width: 300px) {\n    .s0__container {}\n}']
            
            css.forEach((chunk, index) => expect(chunk).to.matchCSS(res[index]));
            expect(css.length).to.equal(res.length);

        })
    })

})
