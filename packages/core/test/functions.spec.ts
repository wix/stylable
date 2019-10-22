import { expectWarningsFromTransform } from '@stylable/core-test-kit';
import { generateStylableRoot } from '@stylable/core-test-kit';
import { expect } from 'chai';
import { resolve } from 'path';
import postcss from 'postcss';
import { functionWarnings } from '../src';
import { nativeFunctionsDic } from '../src/native-reserved-lists';

// var receives special handling and standalone testing
export const testedNativeFunctions = Object.keys(nativeFunctionsDic).filter(func => func !== 'var');

describe('Stylable functions (native, formatter and variable)', () => {
    describe('transform', () => {
        it('apply simple js formatter with no arguments', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        content: `
                            :import {
                                -st-from: "./formatter";
                                -st-default: colorGreen;
                            }
                            .container {
                                background: colorGreen();
                            }
                        `
                    },
                    '/formatter.js': {
                        content: `
                            module.exports = function() {
                                return 'green';
                            }
                        `
                    }
                }
            });

            const rule = result.nodes![0] as postcss.Rule;
            expect(rule.nodes![0].toString()).to.equal('background: green');
        });

        it('apply simple js formatter with quote wrapped args', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        content: `
                            :import {
                                -st-from: "./formatter";
                                -st-default: formatter;
                            }
                            :import {
                                -st-from: "./mixin";
                                -st-default: mixin;
                            }
                            .container {
                                background: formatter(1, "2px solid red" 10px);
                                -st-mixin: mixin(1, "2");
                            }
                        `
                    },
                    '/formatter.js': {
                        content: `
                            module.exports = function() {
                                return [...arguments].join(' ');
                            }
                        `
                    },
                    '/mixin.js': {
                        content: `
                            module.exports = function(args) {
                                return {
                                    content: [...args].map((x)=>\`url(\${JSON.stringify(x)})\`).join(', ')
                                };
                            }
                        `
                    }
                }
            });

            const rule = result.nodes![0] as postcss.Rule;
            expect(rule.nodes![0].toString()).to.equal('background: 1 2px solid red 10px');
            expect(rule.nodes![1].toString()).to.equal('content: url("1"), url("2")');
        });

        it('apply simple js formatter with a single argument', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        content: `
                            :import {
                                -st-from: "./formatter";
                                -st-default: color;
                            }
                            .container {
                                background: color(green);
                            }
                        `
                    },
                    '/formatter.js': {
                        content: `
                            module.exports = function(color) {
                                return color;
                            }
                        `
                    }
                }
            });

            const rule = result.nodes![0] as postcss.Rule;
            expect(rule.nodes![0].toString()).to.equal('background: green');
        });

        it('apply simple js formatter with a multiple arguments', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        content: `
                            :import {
                                -st-from: "./formatter";
                                -st-default: myBorder;
                            }
                            .container {
                                border: myBorder(2px, solid, green);
                            }
                        `
                    },
                    '/formatter.js': {
                        content: `
                            module.exports = function(size, style, color) {
                                return size + " " + style + " " + color;
                            }
                        `
                    }
                }
            });

            const rule = result.nodes![0] as postcss.Rule;
            expect(rule.nodes![0].toString()).to.equal('border: 2px solid green');
        });

        it('apply simple js formatter with a nested formatter', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        content: `
                            :import {
                                -st-from: "./formatter";
                                -st-default: addSomePx;
                                -st-named: border;
                            }
                            .container {
                                border: border(addSomePx(1, 5), solid, green);
                            }
                        `
                    },
                    '/formatter.js': {
                        content: `
                            module.exports = function(size, toAdd) {
                                return Number(size) + Number(toAdd) + 'px';
                            }
                            module.exports.border = function(size, style, color) {
                                return size + " " + style + " " + color;
                            }
                        `
                    }
                }
            });

            const rule = result.nodes![0] as postcss.Rule;
            expect(rule.nodes![0].toString()).to.equal('border: 6px solid green');
        });

        it('should parse arguments passed to a formatter, seperated by commas', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        content: `
                            :import {
                                -st-from: "./formatter";
                                -st-default: print;
                                -st-named: argsAmount;
                            }
                            :vars {
                                x: 1;
                            }
                            .container {
                                border: print(argsAmount(a, a b, value(x) str), argsAmount(2, 2) argsAmount(1));
                            }
                        `
                    },
                    '/formatter.js': {
                        content: `
                            module.exports = function() {
                                return Array.prototype.join.call(arguments, ' ');
                            }
                            module.exports.argsAmount = function() {
                                return arguments.length;
                            }
                        `
                    }
                }
            });

            const rule = result.nodes![0] as postcss.Rule;
            expect(rule.nodes![0].toString()).to.equal('border: 3 2 1');
        });

        describe('native', () => {
            testedNativeFunctions.forEach(cssFunc => {
                // cannot use formatter inside a url naitve function
                if (cssFunc !== 'url') {
                    it(`should pass through native function (${cssFunc}) and resolve formatters`, () => {
                        const result = generateStylableRoot({
                            entry: `/style.st.css`,
                            files: {
                                '/style.st.css': {
                                    content: `
                                        :import {
                                            -st-from: "./formatter";
                                            -st-default: print;
                                        }
                                        .container {
                                            border: ${cssFunc}(${cssFunc}(print(print(1))));
                                        }
                                    `
                                },
                                '/formatter.js': {
                                    content: `
                                        module.exports = function(arg) {
                                            return arg;
                                        }
                                    `
                                }
                            }
                        });

                        const rule = result.nodes![0] as postcss.Rule;
                        expect(rule.nodes![0].toString()).to.equal(
                            `border: ${cssFunc}(${cssFunc}(1))`
                        );
                    });
                }
            });

            it('should pass-through native css functions', () => {
                const result = generateStylableRoot({
                    entry: `/style.st.css`,
                    files: {
                        '/style.st.css': {
                            content: `
                                :import {
                                    -st-from: "./formatter";
                                    -st-default: print;
                                }
                                :import {
                                    -st-from: "./vars.st.css";
                                    -st-named: myVar;
                                }
                                .container {
                                    background: print(value(myVar));
                                }
                            `
                        },
                        '/vars.st.css': {
                            content: `
                                :vars {
                                    myVar: calc(42 * 42);
                                }
                            `
                        },
                        '/formatter.js': {
                            content: `
                                module.exports = function() {
                                    return [...arguments].filter(Boolean).join(' ');
                                }
                            `
                        }
                    }
                });

                const rule = result.nodes![0] as postcss.Rule;
                expect(rule.nodes![0].toString()).to.equal('background: calc(42 * 42)');
            });

            xit('should allow using formatters inside a url native function', () => {
                // see: https://github.com/TrySound/postcss-value-parser/issues/34
                const result = generateStylableRoot({
                    entry: `/style.st.css`,
                    files: {
                        '/style.st.css': {
                            content: `
                                :import {
                                    -st-from: "./formatter";
                                    -st-default: print;
                                }
                                .container {
                                    background: url(print(some-static-url));
                                }
                            `
                        },
                        '/formatter.js': {
                            content: `
                                module.exports = function print(arg) {
                                    return arg;
                                }
                            `
                        }
                    }
                });

                const rule = result.nodes![0] as postcss.Rule;
                expect(rule.nodes![0].toString()).to.equal('background: url("some-static-url")');
            });

            it('should support a native url function', () => {
                const result = generateStylableRoot({
                    entry: `/style.st.css`,
                    files: {
                        '/style.st.css': {
                            content: `
                                .container {
                                    background: url("some-static-url");
                                }
                            `
                        }
                    }
                });

                const rule = result.nodes![0] as postcss.Rule;
                expect(rule.nodes![0].toString()).to.equal('background: url("some-static-url")');
            });
        });

        it('passes through cyclic vars', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        content: `
                            :import {
                                -st-from: "./formatter";
                                -st-default: print;
                            }
                            :vars {
                                a: value(b);
                                b: value(a);
                            }
                            .container {
                                border: print(print(value(a)));
                            }
                        `
                    },
                    '/formatter.js': {
                        content: `
                            module.exports = function(result) {
                                return result;
                            }
                        `
                    }
                }
            });

            const rule = result.nodes![0] as postcss.Rule;
            expect(rule.nodes![0].toString()).to.equal('border: value(a)');
        });

        it('passes through cyclic vars through multiple files', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        content: `
                        :import {
                            -st-from: "./style1.st.css";
                            -st-named: color2;
                        }
                        :vars {
                            color1: 1px value(color2);
                        }
                        .container {
                            background: value(color2);
                        }
                    `
                    },
                    '/style1.st.css': {
                        content: `
                            :import {
                                -st-from: "./style.st.css";
                                -st-named: color1
                            }
                            :vars {
                                color2: value(color1)
                            }
                        `
                    }
                }
            });

            const rule = result.nodes![0] as postcss.Rule;
            expect(rule.nodes![0].toString()).to.equal('background: 1px value(color2)');
        });

        it('should support using formatters in variable declarations', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        content: `
                            :import {
                                -st-from: "./formatter";
                                -st-default: myBorder;
                            }
                            :vars {
                                border: myBorder(5, 1);
                            }
                            .container {
                                border: value(border);
                            }
                        `
                    },
                    '/formatter.js': {
                        content: `
                            module.exports = function myBorder(amount, size) {
                                return (Number(size) + Number(amount)) + 'px';
                            }
                        `
                    }
                }
            });

            const rule = result.nodes![0] as postcss.Rule;
            expect(rule.nodes![0].toString()).to.equal('border: 6px');
        });

        it('should support using formatters in an imported variable declarations', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        content: `
                            :import {
                                -st-from: "./vars.st.css";
                                -st-named: color1;
                            }
                            .container {
                                background: value(color1);
                            }
                        `
                    },
                    '/vars.st.css': {
                        content: `
                            :import {
                                -st-from: "./formatter";
                                -st-default: getGreen;
                            }
                            :vars {
                                color1: getGreen();
                            }
                        `
                    },
                    '/formatter.js': {
                        content: `
                            module.exports = function getGreen() {
                                return 'green';
                            }
                        `
                    }
                }
            });

            const rule = result.nodes![0] as postcss.Rule;
            expect(rule.nodes![0].toString()).to.equal('background: green');
        });

        it('should support using formatters in a complex multi file scenario', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        content: `
                            :import {
                                -st-from: "./vars-outer.st.css";
                                -st-named: myBorder;
                            }
                            .container {
                                border: value(myBorder);
                            }
                        `
                    },
                    '/vars-outer.st.css': {
                        content: `
                            :import {
                                -st-from: "./formatter-outer";
                                -st-default: normalizeBorder;
                            }
                            :import {
                                -st-from: "./vars-inner.st.css";
                                -st-named: borderSize;
                            }
                            :vars {
                                myBorder: normalizeBorder(value(borderSize));
                            }
                        `
                    },
                    '/formatter-outer.js': {
                        content: `
                            module.exports = function normalizeBorder(size) {
                                return size + 'px' + ' ' + 'solid black';
                            }
                        `
                    },
                    '/vars-inner.st.css': {
                        content: `
                            :import {
                                -st-from: "./formatter-inner";
                                -st-default: biggerByTwo;
                            }
                            :vars {
                                borderSize: biggerByTwo(1);
                            }
                        `
                    },
                    '/formatter-inner.js': {
                        content: `
                            module.exports = function biggerByTwo(origSize) {
                                return Number(origSize) + 2;
                            }
                        `
                    }
                }
            });

            const rule = result.nodes![0] as postcss.Rule;
            expect(rule.nodes![0].toString()).to.equal('border: 3px solid black');
        });

        it('should support using formatters in a complex multi file scenario', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        content: `
                            :import {
                                -st-from: "./formatter";
                                -st-default: maxWidthAdd50Px;
                            }
                            :vars {
                                bigScreenWidth: 1800;
                            }
                            @media maxWidthAdd50Px(value(bigScreenWidth)) {}
                        `
                    },
                    '/formatter.js': {
                        content: `
                            module.exports = function maxWidthAdd50Px(origSize) {
                                return "max-width: " + (Number(origSize) + Number(50)) + "px";
                            }
                        `
                    }
                }
            });

            const rule = result.nodes![0] as postcss.AtRule;
            expect(rule.params).to.equal('max-width: 1850px');
        });

        it('should gracefully fail when a formatter throws an error and return the source', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        content: `
                            :import {
                                -st-from: "./formatter";
                                -st-default: fail;
                            }
                            :vars {
                                param1: red;
                            }
                            .some-class {
                                color: fail(a, value(param1), c);
                            }
                        `
                    },
                    '/formatter.js': {
                        content: `
                            module.exports = function fail() {
                                throw new Error("FAIL FAIL FAIL");
                            }
                        `
                    }
                }
            });

            const rule = result.nodes![0] as postcss.Rule;
            expect(rule.nodes![0].toString()).to.equal('color: fail(a, red, c)');
        });
    });

    describe('diagnostics', () => {
        describe('value()', () => {
            it('should return warning when passing more than one argument to a value() function', () => {
                expectWarningsFromTransform(
                    {
                        entry: '/style.st.css',
                        files: {
                            '/style.st.css': {
                                content: `
                            :vars {
                                color1: red;
                                color2: gold;
                            }
                            .my-class {
                                |color:value($color1, color2$)|;
                            }
                            `
                            }
                        }
                    },
                    [
                        {
                            message: functionWarnings.MULTI_ARGS_IN_VALUE('color1, color2'),
                            file: '/style.st.css'
                        }
                    ]
                );
            });

            it('should return warning for unknown var on transform', () => {
                expectWarningsFromTransform(
                    {
                        entry: '/style.st.css',
                        files: {
                            '/style.st.css': {
                                content: `
                            .gaga{
                                |color:value($myColor$)|;
                            }
                            `
                            }
                        }
                    },
                    [{ message: functionWarnings.UNKNOWN_VAR('myColor'), file: '/style.st.css' }]
                );
            });

            it('class cannot be used as var', () => {
                const config = {
                    entry: '/main.st.css',
                    files: {
                        '/main.st.css': {
                            content: `
                            :import{
                                -st-from:"./style.st.css";
                                -st-named:my-class;
                            }
                            .root{
                                |color:value($my-class$)|;
                            }
                          `
                        },
                        '/style.st.css': {
                            content: `
                                .my-class {}
                            `
                        }
                    }
                };
                expectWarningsFromTransform(config, [
                    {
                        message: functionWarnings.CANNOT_USE_AS_VALUE('class', 'my-class'),
                        file: '/main.st.css'
                    }
                ]);
            });

            it('stylesheet cannot be used as var', () => {
                const config = {
                    entry: '/main.st.css',
                    files: {
                        '/main.st.css': {
                            content: `
                            :import{
                                -st-from:"./file.st.css";
                                -st-default:Comp;
                            }
                            .root{
                                |color:value($Comp$)|;
                            }
                          `
                        },
                        '/file.st.css': {
                            content: ''
                        }
                    }
                };
                expectWarningsFromTransform(config, [
                    {
                        message: functionWarnings.CANNOT_USE_AS_VALUE('stylesheet', 'Comp'),
                        file: '/main.st.css'
                    }
                ]);
            });

            it('JS imports cannot be used as vars', () => {
                const config = {
                    entry: '/main.st.css',
                    files: {
                        '/main.st.css': {
                            content: `
                            :import{
                                -st-from:"./mixins";
                                -st-default:my-mixin;
                            }
                            .root{
                                |color:value($my-mixin$)|;
                            }
                          `
                        },
                        '/mixins.js': {
                            content: `module.exports = function myMixin() {};`
                        }
                    }
                };
                expectWarningsFromTransform(config, [
                    {
                        message: functionWarnings.CANNOT_USE_JS_AS_VALUE('my-mixin'),
                        file: '/main.st.css'
                    }
                ]);
            });

            it('should warn when encountering a cyclic dependency in a var definition', () => {
                const config = {
                    entry: '/main.st.css',
                    files: {
                        '/main.st.css': {
                            content: `
                            :vars {
                                a: value(b);
                                b: value(c);
                                |c: value(a)|;
                            }
                            .root{
                                color: value(a);
                            }
                          `
                        }
                    }
                };
                 const mainPath = resolve('/main.st.css');
                expectWarningsFromTransform(config, [
                    {
                        message: functionWarnings.CYCLIC_VALUE([
                            `${mainPath}: a`,
                            `${mainPath}: b`,
                            `${mainPath}: c`,
                            `${mainPath}: a`
                        ]),
                        file: '/main.st.css'
                    }
                ]);
            });
        });

        describe('formatters', () => {
            it('should warn when trying to use a missing formatter', () => {
                const key = 'print';
                const config = {
                    entry: `/main.st.css`,
                    files: {
                        '/main.st.css': {
                            content: `
                            .container {
                                |border: $print$|();
                            }
                            `
                        }
                    }
                };

                expectWarningsFromTransform(config, [
                    { message: functionWarnings.UNKNOWN_FORMATTER(key), file: '/main.st.css' }
                ]);
            });

            it('should warn a formatter throws an error', () => {
                const config = {
                    entry: `/main.st.css`,
                    files: {
                        '/main.st.css': {
                            content: `
                            :import {
                                -st-from: "./formatter";
                                -st-default: fail;
                            }
                            :vars {
                                param1: red;
                            }
                            .some-class {
                                |color: $fail(a, value(param1), c)$|;
                            }
                            `
                        },
                        '/formatter.js': {
                            content: `
                                module.exports = function fail() {
                                    throw new Error("FAIL FAIL FAIL");
                                }
                            `
                        }
                    }
                };

                expectWarningsFromTransform(config, [
                    {
                        message: functionWarnings.FAIL_TO_EXECUTE_FORMATTER(
                            'fail(a, red, c)',
                            'FAIL FAIL FAIL'
                        ),
                        file: '/main.st.css'
                    }
                ]);
            });

            it('should handle empty functions', () => {
                expectWarningsFromTransform(
                    {
                        entry: `/style.st.css`,
                        files: {
                            '/style.st.css': {
                                content: `
                                :vars {
                                    a: 100px;
                                    b: "max-width: 100px";
                                }
                                .x{font-family: (aaa)}
                                @media screen (max-width: 100px) {}
                                @media screen (max-width: value(a)) {}
                                @media screen (value(b)) {}
                            `
                            }
                        }
                    },
                    []
                );
            });
        });

        describe('native', () => {
            testedNativeFunctions.forEach(cssFunc => {
                it(`should not return a warning for native ${cssFunc} pseudo class`, () => {
                    const config = {
                        entry: '/main.css',
                        files: {
                            '/main.css': {
                                content: `
                                .myClass {
                                    background: ${cssFunc}(a, b, c);
                                }`
                            }
                        }
                    };
                    expectWarningsFromTransform(config, []);
                });
            });
        });
    });
});
