import { fromCSS } from "../src";
import { Import } from '../src/import';
import { Stylesheet } from '../src/stylesheet';
import { expect } from "chai";

describe('Stylesheet', function () {


    describe('create', function () {

        it('create css in js definition', function () {

            var sheet = fromCSS(`
                .container {
                    color: red;
                }
            `);

            expect(sheet.cssDefinition).to.eql({
                ".container": { color: "red" }
            });

        });

        it('create a stylesheet from css', function () {

            var sheet = fromCSS(`
                .container { }
            `)

            expect(sheet.classes).to.eql({
                root: 'root',
                container: "container"
            });

        });

        it('create a stylesheet from css with multiple selectors', function () {

            var sheet = fromCSS(`
                .container { }
                .image { }
            `)

            expect(sheet.classes).to.eql({
                root: 'root',
                container: "container",
                image: "image"
            });

        });

        it('create a stylesheet from css with nested selector', function () {

            var sheet = fromCSS(`
                .container .image { } 
            `)

            expect(sheet.classes).to.eql({
                root: 'root',
                container: "container",
                image: "image"
            });

        });

        it('create a stylesheet from css with multiple selectors in the same declaration', function () {

            var sheet = fromCSS(`
                .container, .wrapper .image { } 
            `)

            expect(sheet.classes).to.eql({
                root: 'root',
                container: "container",
                image: "image",
                wrapper: "wrapper"
            });

        });

    });

    describe('process', function () {

        it('throw when -st-root used in complex selector', function () {

            expect(function () {
                fromCSS(`
                    .container[attr] {
                        -st-root: true;
                        color: red;
                    }
                `);
            }).throw('-st-root on complex selector: .container[attr]');

        });

        it('with empty css', function () {
            const sheet = fromCSS(``);
            expect(sheet.classes).to.eql({root: 'root'});
            expect(sheet.typedClasses).to.eql({
                root: { "-st-root": true }
            });
        });

        it('with typed class -st-root true', function () {

            const sheet = fromCSS(`
                .container {
                    -st-root: true;
                }
            `);

            expect(sheet.typedClasses).to.eql({
                root: { "-st-root": true },
                container: {
                    "-st-root": true
                }
            });

        });

        it('with typed class -st-root ANY_VALUE that is not "false"', function () {
            const sheet = fromCSS(`
                .container {
                    -st-root: ANY_VALUE;
                }
            `);

            expect(sheet.typedClasses).to.eql({
                root: { "-st-root": true },
                container: {
                    "-st-root": true
                }
            })
        });

        it('with typed class -st-root is false', function () {
            const sheet = fromCSS(`
                .container {
                    -st-root: false;
                }
            `);

            expect(sheet.typedClasses).to.eql({
                root: { "-st-root": true },
                container: {
                    "-st-root": false
                }
            })
        });

        it('create import definitions (format A)', function () {

            const sheet = fromCSS(`
                :import("./path/to/thing"){
                    -st-default: Name;
                    -st-named: Button as Btn, Icon;
                    -st-named-ExportName: MyName;
                }
            `);

            expect(sheet.imports).to.eql([new Import("./path/to/thing", "Name", {
                Btn: "Button",
                Icon: "Icon",
                MyName: "ExportName"
            })]);


        });

        it('create import definitions (format B)', function () {

            var sheet = fromCSS(`
                :import {
                    -st-from: "./path/to/thing";
                }
            `);

            expect(sheet.imports).to.eql([new Import("./path/to/thing", "", {})]);

        });

        it('with -st-states', function () {
            const sheet = fromCSS(`
                .container {
                    -st-states: stateA, stateB;
                }
            `);

            expect(sheet.typedClasses).to.eql({
                root: { "-st-root": true },
                container: {
                    "-st-states": ["stateA", "stateB"]
                }
            })
        });

        it('with empty -st-states ', function () {
            const sheet = fromCSS(`
                .container {
                    -st-states: ;
                }
            `);

            expect(sheet.typedClasses).to.eql({
                root: { "-st-root": true },
                container: {
                    "-st-states": []
                }
            })
        })


        it('with -st-extends', function () {
            const sheet = fromCSS(`
                :import("./path/to/thing"){
                    -st-default: Thing;
                }
                .container {
                    -st-extends: Thing;
                }
            `);

            expect(sheet.typedClasses).to.eql({
                root: { "-st-root": true },
                container: {
                    "-st-extends": "Thing"
                }
            })
        })



        it('with -st-mixin', function () {

            const sheet = fromCSS(`
                :import("./path/to/mixin"){
                    -st-named: MyMixin1;
                }
                .container {
                    -st-mixin: MyMixin1;
                }
            `);

            expect(sheet.mixinSelectors).to.eql({
                ".container": [
                    { type: "MyMixin1", options: [] }
                ]
            })
        })

        it('with -st-mixin with params', function () {

            const sheet = fromCSS(`
                :import("./path/to/mixin"){
                    -st-named: MyMixin1;
                }
                .container {
                    -st-mixin: MyMixin1(100px, 50);
                }
            `);

            expect(sheet.mixinSelectors).to.eql({
                ".container": [
                    { type: "MyMixin1", options: ["100px", "50"] }
                ]
            })
        });

        it('with -st-mixin with params with spaces between', function () {
            const sheet = Stylesheet.fromCSS(`
                :import("./path/to/mixin"){
                    -st-named: MyMixin1;
                }
                .container {
                    -st-mixin: MyMixin1( 300 , xxx );
                }
            `);
            
            expect(sheet.mixinSelectors).to.eql({
                ".container": [
                    { type: "MyMixin1", options: [`300`, `xxx`] }
                ]
            })
        });

        it('with -st-mixin with missing params should remove the last', function () {
            const sheet = Stylesheet.fromCSS(`
                :import("./path/to/mixin"){
                    -st-named: MyMixin1;
                }
                .container {
                    -st-mixin: MyMixin1( 300 , , , );
                }
            `);
            
            expect(sheet.mixinSelectors).to.eql({
                ".container": [
                    { type: "MyMixin1", options: [`300`, ``, ``] }
                ]
            })
        });

        it('with -st-mixin with params normalized', function () {
            const sheet = Stylesheet.fromCSS(`
                :import("./path/to/mixin"){
                    -st-named: MyMixin1;
                }
                .container {
                    -st-mixin: MyMixin1(300, aaa, "bbb", "cc,c", ""ddd"", "\"eee\"", 'fff');
                }
            `);

            expect(sheet.mixinSelectors).to.eql({
                ".container": [
                    { type: "MyMixin1", options: [`300`, `aaa`, `bbb`, `cc,c`, `"ddd"`, `"eee"`, `'fff'`] }
                ]
            })
        });

        it.skip("not working mixin arguments", function() {
            // postcss-safe-parser outputs wrong AST and it breaks in -st-mixin value parser
            const sheet = Stylesheet.fromCSS(`
                :import("./path/to/mixin"){
                    -st-named: MyMixin1;
                }
                .classA {
                    -st-mixin: MyMixin1("3\"00");
                }
                .classB {
                    -st-mixin: MyMixin1(aaa, "x\" ,xx");
                }
                .classC {
                    -st-mixin: MyMixin1(bbb, 'y'yy');
                }
            `);

            expect(sheet.mixinSelectors).to.eql({
                ".classA": [ { type: "MyMixin1", options: [`3"00`] } ],
                ".classB": [ { type: "MyMixin1", options: [`aaa`, `x" ,xx`] } ],
                ".classC": [ { type: "MyMixin1", options: [`bbb`, `'y'yy'`] } ]
            })
        });

        it('with -st-mixin with multiple mixins', function () {

            const sheet = fromCSS(`
                :import("./path/to/mixin"){
                    -st-named: MyMixin1, MyMixin2;
                }
                .container {
                    -st-mixin:  MyMixin1(100px, 50) MyMixin2  MyMixin3();
                }
            `);

            expect(sheet.mixinSelectors).to.eql({
                ".container": [
                    { type: "MyMixin1", options: ["100px", "50"] },
                    { type: "MyMixin2", options: [] },
                    { type: "MyMixin3", options: [] },
                ]
            })
        })

        it('with -st-mixin no params multiple defs', function () {

            const sheet = fromCSS(`
                :import("./path/to/mixin"){
                    -st-named: MyMixin1, MyMixin2;
                }
                .container {
                    -st-mixin: MyMixin1;
                    -st-mixin: MyMixin2;
                }
            `);

            expect(sheet.mixinSelectors).to.eql({
                ".container": [
                    { type: "MyMixin2", options: [] }
                ]
            })
        })

    });

    describe('generateStateAttribute', function () {


        it('generate data attribute from namespace and state name', function () {
            var sheet = new Stylesheet({}, "namespace");
            const attr = sheet.stateAttr('my-state')
            expect(attr).to.equal('data-namespace-my-state');
        });

        it('generate non case sensitive data attribute', function () {

            var sheet = new Stylesheet({}, "NameSpace");
            const attr = sheet.stateAttr('My-State')
            expect(attr).to.equal('data-namespace-my-state');

        });

    })

    describe('cssStates', function () {

        it('generate data attribute from namespace and state name', function () {
            var sheet = new Stylesheet({}, "namespace");
            const attrs = sheet.cssStates({ state1: true, state2: false })
            expect(attrs).to.eql({
                'data-namespace-state1': true
            });
        });

    })

    describe('namespace', function () {

        it('should be empty when no namespace is provided', function () {
            var style = new Stylesheet({}, "''")
            expect(style.namespace).to.equal('');
        });

        it('should be set when provided', function () {
            var style = new Stylesheet({}, 'mynamespace');
            expect(style.namespace).to.equal('mynamespace');
        });

        it('should be set from definition', function () {
            var style = new Stylesheet({ "@namespace": "mynamespace" });
            expect(style.namespace).to.equal('mynamespace');
        });
        it('should be set from multiple definitions', function () {
            var style = new Stylesheet({ "@namespace": ["mynamespace", "mylastnamespace"] });
            expect(style.namespace).to.equal('mylastnamespace');
        });

        
        it('should be set when provided with string ("") wrapping', function () {
            var style = new Stylesheet({}, '"mynamespace"');
            expect(style.namespace).to.equal('mynamespace');
        });

        it("should be set when provided with string ('') wrapping", function () {
            var style = new Stylesheet({}, "'mynamespace'");
            expect(style.namespace).to.equal('mynamespace');
        });
        
    })

    describe('variables', function () {

        it('should be collected from :vars selector', function () {
            var style = new Stylesheet({
                ":vars": {
                    name: 'value'
                }
            });

            expect(style.vars).to.eql({
                name: 'value'
            });

        });


        it('name should not by modified', function () {

            var styleCSS = fromCSS(`
                :vars{
                    my-Name: value;
                }
            `);

            const expected = {
                "my-Name": 'value'
            };

            expect(styleCSS.vars).to.eql(expected);

        });



        it('should support multiple declarations', function () {

            var styleCSS = fromCSS(`
                :vars{
                    my-Name: value;
                }
                :vars{
                    my-Name: value2;
                    my-Other: value3;
                }
            `);

            const expected = {
                "my-Name": 'value2',
                "my-Other": 'value3'
            };

            expect(styleCSS.vars).to.eql(expected);

        });

    })

    describe('global', function () {
        it('should not by modified', function () {

            var sheet = fromCSS(`
                :global(.myselector){
                    color: red;
                }
            `);

            expect(sheet.classes).to.not.contain({
                myselector: 'myselector'
            });

        });

        it('should not by modified and keep scoping after', function () {

            var sheet = fromCSS(`
                :global(.myselector) .myclass{
                    color: red;
                }
            `);

            expect(sheet.classes).to.not.contain({
                myselector: 'myselector'
            });

            expect(sheet.classes).to.not.contain({
                myselector: 'myselector'
            });

        });

        it('should not by modified complex global selector', function () {

            var sheet = fromCSS(`
                :global(.myselector .otherselector){
                    color: red;
                }
            `);

            expect(sheet.classes).to.not.contain({
                myselector: 'myselector'
            });

            expect(sheet.classes).to.not.contain({
                otherselector: 'otherselector'
            });

        });

    })

    describe('source', function(){
        it('should contain source string', function(){
            var source = "source string";
            var sheet = new Stylesheet({}, '', source);
            expect(sheet.source).to.equal(source);
        });
        it('should contain source string fromCSS', function(){
            var source = "source string";
            var sheet = fromCSS(`
                :global(.myselector .otherselector){
                    color: red;
                }
            `, '', source);

            expect(sheet.source).to.equal(source);
        });
    })

    describe('resilient', function(){

        it('not break types on broken selector', function(){

            var sheet = fromCSS(`
                .root{-st-states: a, b;}
                .root:
            `);

            expect(sheet.typedClasses[sheet.root]).to.eql({
                "-st-states": ["a", "b"]
            });
        });
    })

})

