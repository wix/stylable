import { fromCSS } from "../src";
import { Resolver } from '../src/resolver';
import { Stylesheet } from '../src/stylesheet';
import { expect } from "chai";
import { defineStylableEnv, CSS, JS } from "./stylable-test-kit";

describe('Resolver', function () {

    describe('resolve', function () {

        it('get the import definition for the symbol', function () {
            var sheetA = fromCSS(``);

            var sheetB = fromCSS(`
                :import("./path/to/thing"){
                    -st-default: Name;
                }
                .class {
                    -st-extends: Name;
                }
            `);

            const resolver = new Resolver({ "./path/to/thing": sheetA });

            expect(resolver.resolve(sheetB, "class")).to.equal(sheetA);
            expect(resolver.resolve(sheetB, "NotExist")).to.equal(sheetB);
        });

        it('get the import named definition for the symbol', function () {
            var sheetA = fromCSS(``);

            var sheetB = fromCSS(`
                :import {
                    -st-from: "./path/to/thing";
                    -st-named: x;
                }
                .class {
                    -st-extends: x;
                }
            `);

            const resolver = new Resolver({ "./path/to/thing": { x:sheetA } });

            expect(resolver.resolve(sheetB, "class")).to.equal(sheetA);
        });

        it('get the import named definition for the symbol when default is override named import', function () {
            var sheetNamed = fromCSS(``);
            var sheetDefault = fromCSS(``);

            var sheetMain = fromCSS(`
                :import {
                    -st-from: "./path/to/thing";
                    -st-default: x;
                    -st-named: x as y;
                }
                .classExtendDefault {
                    -st-extends: x;
                }
                .classExtendNamed {
                    -st-extends: y;
                }
            `);

            const resolver = new Resolver({ "./path/to/thing": { x:sheetNamed, default:sheetDefault } });

            expect(resolver.resolve(sheetMain, "classExtendDefault")).to.equal(sheetDefault);
            expect(resolver.resolve(sheetMain, "classExtendNamed")).to.equal(sheetNamed);
        });

    });

    describe('resolveSymbols', function () {

        it('should resolve default symbols', function () {

            const resolvedModule = { resolved: 'name1' };
            const sheet = new Stylesheet({
                ":import('./path')": {
                    "-st-default": "name1"
                }
            }, "namespace");

            const resolved = new Resolver({ "./path": resolvedModule }).resolveSymbols(sheet)

            expect(resolved).to.eql({ name1: resolvedModule, root:'root' });
        });

        it('should handle nameless default by using the path', function () {

            const resolvedModule = { resolved: 'name1' };

            var sheet = new Stylesheet({
                ":import('./path')": {}
            }, "namespace");

            const resolved = new Resolver({ "./path": resolvedModule }).resolveSymbols(sheet);

            expect(resolved).to.eql({ './path': resolvedModule, root:'root' });

        });

        it('should resolve named symbols', function () {

            const resolvedModule1 = { resolved: 'name1' };
            const resolvedModule2 = { resolved: 'name2' };

            var sheet = new Stylesheet({
                ":import('./path/1')": {
                    "-st-named": "name1"
                },
                ":import('./path/2')": {
                    "-st-named": "name2"
                }
            }, "namespace");

            const resolved = new Resolver({
                "./path/1": { name1: resolvedModule1 },
                "./path/2": { name2: resolvedModule2 }
            }).resolveSymbols(sheet);

            expect(resolved).to.contain({ name1: resolvedModule1, name2: resolvedModule2 });
        }); 

        it('should resolve stylesheet vars', function () {

            const resolvedModule = new Stylesheet({
                ":vars": {
                    "param1": "red",
                    "param2": "blue",
                }
            });

            var sheet = new Stylesheet({
                ":import('./path')": {
                    "-st-named": "param1, param2",
                },
                ":vars": {
                    "param3": "green",
                },
            }, "namespace");

            const resolved = new Resolver({
                "./path": resolvedModule,
            }).resolveSymbols(sheet);

            expect(resolved).to.contain({ param1: "red", param2: "blue", param3: "green" });
        });

        it('should resolve named vars alias', function(){
            const resolvedModule = new Stylesheet({
                ":vars": {
                    "param1": "red",
                    "param2": "blue",
                }
            });

            var sheet = new Stylesheet({
                ":import": {
                    "-st-from": "./path",
                    "-st-named": "param1 as P1, param2 as P2",
                },
                ":vars": {
                    "P3": "green",
                },
            }, "namespace");

            const resolved = new Resolver({
                "./path": resolvedModule,
            }).resolveSymbols(sheet);

            expect(resolved).to.contain({ P1: "red", P2: "blue", P3: "green" });
        });

        it('should throw error on var name conflict', function () {
            const resolvedModule = new Stylesheet({
                ":vars": {
                    "param1": "red",
                    "param2": "blue",
                }
            });

            var sheet = new Stylesheet({
                ":import('./path')": {
                    "-st-named": "param1, param2",
                },
                ":vars": {
                    "param": "orange",
                    "param1": "purple",
                },
            }, "namespace");

            expect(function resolveSymbols() {
                new Resolver({ "./path": resolvedModule }).resolveSymbols(sheet);
            }).to.throw('resolveSymbols: Name param1 already set');
        });

        it('should take last defiled name export', function () {

            const resolvedModule1 = { resolved: 'name1' };
            const resolvedModule2 = { resolved: 'name1' };

            var sheet = new Stylesheet({
                ":import('./path/1')": {
                    "-st-named": "name1"
                },
                ":import('./path/2')": {
                    "-st-named": "name1"
                }
            }, "namespace");

            const resolved = new Resolver({
                "./path/1": { name1: resolvedModule1 },
                "./path/2": { name1: resolvedModule2 }
            }).resolveSymbols(sheet);

            expect(resolved).to.contain({ name1: resolvedModule2 });
        });
    });

    describe('getSymbolDefinition', () => {

        it('should return type "not-found" when symbol is missing', () => {
            const env = defineStylableEnv([
                CSS('./main.css', 'Main', ``)
            ], {});
           
            const mainStylesheet = env.resolver.resolveModule('./main.css');
            const symbolDef = env.resolver.getSymbolDefinition(mainStylesheet, 'missing');

            expect(symbolDef).to.eql({origin:mainStylesheet, type:'not-found', localName:''});
        });

        it('should return class from stylesheet', () => {
            const env = defineStylableEnv([
                CSS('./main.css', 'Main', `
                    .classA {}
                `)
            ], {});
           
            const mainStylesheet = env.resolver.resolveModule('./main.css');
            const symbolDef = env.resolver.getSymbolDefinition(mainStylesheet, 'classA');

            expect(symbolDef).to.eql({origin:mainStylesheet, type:'class', localName:'classA'});
        });

        it('should return var from stylesheet', () => {
            const env = defineStylableEnv([
                CSS('./main.css', 'Main', `
                    :vars {
                        param1: green; 
                    }
                `)
            ], {});
           
            const mainStylesheet = env.resolver.resolveModule('./main.css');
            const symbolDef = env.resolver.getSymbolDefinition(mainStylesheet, 'param1');

            expect(symbolDef).to.eql({origin:mainStylesheet, type:'var', localName:'param1'});
        });

        it('should return class from imported stylesheet', () => {
            const env = defineStylableEnv([
                CSS('./style-x.css', 'StyleX', `
                    .classA {}
                `),
                CSS('./main.css', 'Main', `
                    :import {
                        -st-from: "./style-x.css";
                        -st-named: classA as renamedClassA;
                    }
                `)
            ], {});
           
            const mainStylesheet = env.resolver.resolveModule('./main.css');
            const symbolDef = env.resolver.getSymbolDefinition(mainStylesheet, 'renamedClassA');
            
            const styleX = env.resolver.resolveModule('./style-x.css');
            expect(symbolDef).to.eql({origin:styleX, type:'class', localName:'classA'});
        });

        it('should return var from imported stylesheet', () => {
            const env = defineStylableEnv([
                CSS('./style-x.css', 'StyleX', `
                    :vars {
                        param1: green; 
                    }
                `),
                CSS('./main.css', 'Main', `
                    :import {
                        -st-from: "./style-x.css";
                        -st-named: param1 as renamedParam;
                    }
                `)
            ], {});
           
            const mainStylesheet = env.resolver.resolveModule('./main.css');
            const symbolDef = env.resolver.getSymbolDefinition(mainStylesheet, 'renamedParam');
            
            const styleX = env.resolver.resolveModule('./style-x.css');
            expect(symbolDef).to.eql({origin:styleX, type:'var', localName:'param1'});
        });

        it('should return default imported stylesheet', () => {
            const env = defineStylableEnv([
                CSS('./style-x.css', 'StyleX', ``),
                CSS('./main.css', 'Main', `
                    :import {
                        -st-from: "./style-x.css";
                        -st-default: StyleXDefault;
                    }
                `)
            ], {});
           
            const mainStylesheet = env.resolver.resolveModule('./main.css');
            const symbolDef = env.resolver.getSymbolDefinition(mainStylesheet, 'StyleXDefault');
            
            const styleX = env.resolver.resolveModule('./style-x.css');
            expect(symbolDef).to.eql({origin:styleX, type:'stylesheet', localName:'default'});
        });

        it('should return symbols imported from JS module', () => {
            const env = defineStylableEnv([
                JS('./module-x.js', 'ModuleX', {
                    default:'def-value',
                    other:'named-value'
                }),
                CSS('./main.css', 'Main', `
                    :import {
                        -st-from: "./module-x.js";
                        -st-default: moduleXDefault;
                        -st-named: other as moduleXNamed;
                    }
                `)
            ], {});
           
            const mainStylesheet = env.resolver.resolveModule('./main.css');
            const defaultDef = env.resolver.getSymbolDefinition(mainStylesheet, 'moduleXDefault');
            const namedDef = env.resolver.getSymbolDefinition(mainStylesheet, 'moduleXNamed');
            
            const moduleX = env.resolver.resolveModule('./module-x.js');
            expect(defaultDef, 'default').to.eql({origin:moduleX, type:'JSExport', localName:'default'});
            expect(namedDef, 'named').to.eql({origin:moduleX, type:'JSExport', localName:'other'});
        });

    });

});

