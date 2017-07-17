import { Import } from '../src/import';
import { Stylesheet } from '../src/stylesheet';
import { expect } from "chai";

describe('Stylesheet', function () {


    describe('create', function () {

        it('create css in js definition', function () {

            var sheet = Stylesheet.fromCSS(`
                .container {
                    color: red;
                }
            `);

            expect(sheet.cssDefinition).to.eql({
                ".container": { color: "red" }
            });

        });

        it('create a stylesheet from css', function () {

            var sheet = Stylesheet.fromCSS(`
                .container { }
            `)

            expect(sheet.classes).to.eql({
                root: 'root',
                container: "container"
            });

        });

        it('create a stylesheet from css with multiple selectors', function () {

            var sheet = Stylesheet.fromCSS(`
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

            var sheet = Stylesheet.fromCSS(`
                .container .image { } 
            `)

            expect(sheet.classes).to.eql({
                root: 'root',
                container: "container",
                image: "image"
            });

        });

        it('create a stylesheet from css with multiple selectors in the same declaration', function () {

            var sheet = Stylesheet.fromCSS(`
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

        it('throw when -sb-root used in complex selector', function () {

            expect(function () {
                Stylesheet.fromCSS(`
                    .container[attr] {
                        -sb-root: true;
                        color: red;
                    }
                `);
            }).throw('-sb-root on complex selector: .container[attr]');

        });

        it('with empty css', function () {
            const sheet = Stylesheet.fromCSS(``);
            expect(sheet.classes).to.eql({root: 'root'});
            expect(sheet.typedClasses).to.eql({
                root: { "-sb-root": true }
            });
        });

        it('with typed class -sb-root true', function () {

            const sheet = Stylesheet.fromCSS(`
                .container {
                    -sb-root: true;
                }
            `);

            expect(sheet.typedClasses).to.eql({
                root: { "-sb-root": true },
                container: {
                    "-sb-root": true
                }
            });

        });

        it('with typed class -sb-root ANY_VALUE that is not "false"', function () {
            const sheet = Stylesheet.fromCSS(`
                .container {
                    -sb-root: ANY_VALUE;
                }
            `);

            expect(sheet.typedClasses).to.eql({
                root: { "-sb-root": true },
                container: {
                    "-sb-root": true
                }
            })
        });

        it('with typed class -sb-root is false', function () {
            const sheet = Stylesheet.fromCSS(`
                .container {
                    -sb-root: false;
                }
            `);

            expect(sheet.typedClasses).to.eql({
                root: { "-sb-root": true },
                container: {
                    "-sb-root": false
                }
            })
        });

        it('create import definitions (format A)', function () {

            const sheet = Stylesheet.fromCSS(`
                :import("./path/to/thing"){
                    -sb-default: Name;
                    -sb-named: Button as Btn, Icon;
                    -sb-named-ExportName: MyName;
                }
            `);

            expect(sheet.imports).to.eql([new Import("./path/to/thing", "Name", {
                Btn: "Button",
                Icon: "Icon",
                MyName: "ExportName"
            })]);


        });

        it('create import definitions (format B)', function () {

            var sheet = Stylesheet.fromCSS(`
                :import {
                    -sb-from: "./path/to/thing";
                }
            `);

            expect(sheet.imports).to.eql([new Import("./path/to/thing", "", {})]);

        });

        it('with -sb-states', function () {
            const sheet = Stylesheet.fromCSS(`
                .container {
                    -sb-states: stateA, stateB;
                }
            `);

            expect(sheet.typedClasses).to.eql({
                root: { "-sb-root": true },
                container: {
                    "-sb-states": ["stateA", "stateB"]
                }
            })
        });

        it('with empty -sb-states ', function () {
            const sheet = Stylesheet.fromCSS(`
                .container {
                    -sb-states: ;
                }
            `);

            expect(sheet.typedClasses).to.eql({
                root: { "-sb-root": true },
                container: {
                    "-sb-states": []
                }
            })
        })


        it('with -sb-type', function () {
            const sheet = Stylesheet.fromCSS(`
                :import("./path/to/thing"){
                    -sb-default: Thing;
                }
                .container {
                    -sb-type: Thing;
                }
            `);

            expect(sheet.typedClasses).to.eql({
                root: { "-sb-root": true },
                container: {
                    "-sb-type": "Thing"
                }
            })
        })



        it('with -sb-mixin', function () {

            const sheet = Stylesheet.fromCSS(`
                :import("./path/to/mixin"){
                    -sb-named: MyMixin1;
                }
                .container {
                    -sb-mixin: MyMixin1;
                }
            `);

            expect(sheet.mixinSelectors).to.eql({
                ".container": [
                    { type: "MyMixin1", options: [] }
                ]
            })
        })

        it('with -sb-mixin with params', function () {

            const sheet = Stylesheet.fromCSS(`
                :import("./path/to/mixin"){
                    -sb-named: MyMixin1;
                }
                .container {
                    -sb-mixin: MyMixin1(100px, 50);
                }
            `);

            expect(sheet.mixinSelectors).to.eql({
                ".container": [
                    { type: "MyMixin1", options: ["100px", "50"] }
                ]
            })
        });

        it('with -sb-mixin with multiple mixins', function () {

            const sheet = Stylesheet.fromCSS(`
                :import("./path/to/mixin"){
                    -sb-named: MyMixin1, MyMixin2;
                }
                .container {
                    -sb-mixin:  MyMixin1(100px, 50) MyMixin2  MyMixin3();
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

        it('with -sb-mixin no params multiple defs', function () {

            const sheet = Stylesheet.fromCSS(`
                :import("./path/to/mixin"){
                    -sb-named: MyMixin1, MyMixin2;
                }
                .container {
                    -sb-mixin: MyMixin1;
                    -sb-mixin: MyMixin2;
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

            var styleCSS = Stylesheet.fromCSS(`
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

            var styleCSS = Stylesheet.fromCSS(`
                :vars{
                    my-Name: value;
                }
                :vars{
                    my-Name: value2;
                    my-Other: value3;
                }
            `);

            const expected = {
                "my-Name": ['value', 'value2'],
                "my-Other": 'value3'
            };

            expect(styleCSS.vars).to.eql(expected);

        });

    })

    describe('global', function () {
        it('should not by modified', function () {

            var sheet = Stylesheet.fromCSS(`
                :global(.myselector){
                    color: red;
                }
            `);

            expect(sheet.classes).to.not.contain({
                myselector: 'myselector'
            });

        });

        it('should not by modified and keep scoping after', function () {

            var sheet = Stylesheet.fromCSS(`
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

            var sheet = Stylesheet.fromCSS(`
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
            var sheet = Stylesheet.fromCSS(`
                :global(.myselector .otherselector){
                    color: red;
                }
            `, '', source);

            expect(sheet.source).to.equal(source);
        });
    })

    describe('resilient', function(){

        it('not break types on broken selector', function(){

            var sheet = Stylesheet.fromCSS(`
                .root{-sb-states: a, b;}
                .root:
            `);

            expect(sheet.typedClasses[sheet.root]).to.eql({
                "-sb-states": ["a", "b"]
            });
        });
    })

})

