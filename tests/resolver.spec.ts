import { fromCSS } from "../src";
import { Resolver } from '../src/resolver';
import { Stylesheet } from '../src/stylesheet';
import { expect } from "chai";

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

            expect(resolved).to.eql({ name1: resolvedModule });
        });

        it('should handle nameless default by using the path', function () {

            const resolvedModule = { resolved: 'name1' };

            var sheet = new Stylesheet({
                ":import('./path')": {}
            }, "namespace");

            const resolved = new Resolver({ "./path": resolvedModule }).resolveSymbols(sheet);

            expect(resolved).to.eql({ './path': resolvedModule });

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

        it('should resolve stylesheets', function () {

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


});

