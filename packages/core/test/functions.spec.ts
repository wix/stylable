import { functionWarnings } from '@stylable/core/dist/functions';
import { nativeFunctionsDic } from '@stylable/core/dist/native-reserved-lists';
import {
    diagnosticBankReportToStrings,
    expectTransformDiagnostics,
    generateStylableRoot,
} from '@stylable/core-test-kit';
import { expect } from 'chai';
import type * as postcss from 'postcss';

const functionDiagnostics = diagnosticBankReportToStrings(functionWarnings);

// var receives special handling and standalone testing
const testedNativeFunctions = Object.keys(nativeFunctionsDic).filter((func) => func !== 'var');

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
                        `,
                    },
                    '/formatter.js': {
                        content: `
                            module.exports = function() {
                                return 'green';
                            }
                        `,
                    },
                },
            });

            const rule = result.nodes[0] as postcss.Rule;
            expect(rule.nodes[0].toString()).to.equal('background: green');
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
                            .container {
                                background: formatter(1, "2px solid red" 10px);
                            }
                        `,
                    },
                    '/formatter.js': {
                        content: `
                            module.exports = function() {
                                return [...arguments].join(' ');
                            }
                        `,
                    },
                },
            });

            const rule = result.nodes[0] as postcss.Rule;
            expect(rule.nodes[0].toString()).to.equal('background: 1 2px solid red 10px');
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
                        `,
                    },
                    '/formatter.js': {
                        content: `
                            module.exports = function(color) {
                                return color;
                            }
                        `,
                    },
                },
            });

            const rule = result.nodes[0] as postcss.Rule;
            expect(rule.nodes[0].toString()).to.equal('background: green');
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
                        `,
                    },
                    '/formatter.js': {
                        content: `
                            module.exports = function(size, style, color) {
                                return size + " " + style + " " + color;
                            }
                        `,
                    },
                },
            });

            const rule = result.nodes[0] as postcss.Rule;
            expect(rule.nodes[0].toString()).to.equal('border: 2px solid green');
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
                        `,
                    },
                    '/formatter.js': {
                        content: `
                            module.exports = function(size, toAdd) {
                                return Number(size) + Number(toAdd) + 'px';
                            }
                            module.exports.border = function(size, style, color) {
                                return size + " " + style + " " + color;
                            }
                        `,
                    },
                },
            });

            const rule = result.nodes[0] as postcss.Rule;
            expect(rule.nodes[0].toString()).to.equal('border: 6px solid green');
        });

        it('should parse arguments passed to a formatter, seperated by commas', () => {
            // ToDo: move to formatter / value feature spec
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
                        `,
                    },
                    '/formatter.js': {
                        content: `
                            module.exports = function() {
                                return Array.prototype.join.call(arguments, ' ');
                            }
                            module.exports.argsAmount = function() {
                                return arguments.length;
                            }
                        `,
                    },
                },
            });

            const rule = result.nodes[0] as postcss.Rule;
            expect(rule.nodes[0].toString()).to.equal('border: 3 2 1');
        });

        describe('native', () => {
            testedNativeFunctions.forEach((cssFunc) => {
                // cannot use formatter inside a url naitve function
                if (cssFunc !== 'url' && cssFunc !== 'format') {
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
                                    `,
                                },
                                '/formatter.js': {
                                    content: `
                                        module.exports = function(arg) {
                                            return arg;
                                        }
                                    `,
                                },
                            },
                        });

                        const rule = result.nodes[0] as postcss.Rule;
                        expect(rule.nodes[0].toString()).to.equal(
                            `border: ${cssFunc}(${cssFunc}(1))`
                        );
                    });
                }
            });

            it('should pass-through native css functions', () => {
                // ToDo: move to formatter feature spec
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
                            `,
                        },
                        '/vars.st.css': {
                            content: `
                                :vars {
                                    myVar: calc(42 * 42);
                                }
                            `,
                        },
                        '/formatter.js': {
                            content: `
                                module.exports = function() {
                                    return [...arguments].filter(Boolean).join(' ');
                                }
                            `,
                        },
                    },
                });

                const rule = result.nodes[0] as postcss.Rule;
                expect(rule.nodes[0].toString()).to.equal('background: calc(42 * 42)');
            });

            it('should perserve native format function quotation', () => {
                const result = generateStylableRoot({
                    entry: `/style.st.css`,
                    files: {
                        '/style.st.css': {
                            content: `
                                @font-face {
                                    src: url(/test.woff) format('woff');
                                }
                            `,
                        },
                    },
                });

                const rule = result.nodes[0] as postcss.Rule;
                expect(rule.nodes[0].toString()).to.equal("src: url(/test.woff) format('woff')");
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
                            `,
                        },
                        '/formatter.js': {
                            content: `
                                module.exports = function print(arg) {
                                    return arg;
                                }
                            `,
                        },
                    },
                });

                const rule = result.nodes[0] as postcss.Rule;
                expect(rule.nodes[0].toString()).to.equal('background: url("some-static-url")');
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
                            `,
                        },
                    },
                });

                const rule = result.nodes[0] as postcss.Rule;
                expect(rule.nodes[0].toString()).to.equal('background: url("some-static-url")');
            });

            it('should resolve a 3rd party asset request (~)', () => {
                const result = generateStylableRoot({
                    entry: `/style.st.css`,
                    files: {
                        '/node_modules/external-package/asset.png': { content: '' },
                        '/style.st.css': {
                            content: `
                                .container {
                                    background: url(~external-package/asset.png);
                                    background: url("~external-package/asset.png");
                                    background: url( ~external-package/asset.png);
                                    background: url(~external-package/asset.png) #00D no-repeat fixed;
                                    list-style: square url(~external-package/asset.png);
                                    background: url(
                                          ~external-package/asset.png
                                          );

                                }
                            `,
                        },
                    },
                });

                const rules = (result.nodes[0] as postcss.Rule).nodes.map((node) =>
                    node.toString()
                );
                expect(rules, 'failed resolving third party asset').to.eql([
                    'background: url(./node_modules/external-package/asset.png)',
                    'background: url("./node_modules/external-package/asset.png")',
                    'background: url( ./node_modules/external-package/asset.png)',
                    'background: url(./node_modules/external-package/asset.png) #00D no-repeat fixed',
                    'list-style: square url(./node_modules/external-package/asset.png)',
                    `background: url(
                                          ./node_modules/external-package/asset.png
                                          )`,
                ]);
            });
        });

        it('passes through cyclic vars', () => {
            // ToDo: check if this test is necessary
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
                        `,
                    },
                    '/formatter.js': {
                        content: `
                            module.exports = function(result) {
                                return result;
                            }
                        `,
                    },
                },
            });

            const rule = result.nodes[0] as postcss.Rule;
            expect(rule.nodes[0].toString()).to.equal('border: value(a)');
        });

        it('should support using formatters in a complex multi file scenario', () => {
            // ToDo: move to css-value feature spec
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
                        `,
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
                        `,
                    },
                    '/formatter-outer.js': {
                        content: `
                            module.exports = function normalizeBorder(size) {
                                return size + 'px' + ' ' + 'solid black';
                            }
                        `,
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
                        `,
                    },
                    '/formatter-inner.js': {
                        content: `
                            module.exports = function biggerByTwo(origSize) {
                                return Number(origSize) + 2;
                            }
                        `,
                    },
                },
            });

            const rule = result.nodes[0] as postcss.Rule;
            expect(rule.nodes[0].toString()).to.equal('border: 3px solid black');
        });

        it('should support using a formatter in a media query param', () => {
            // ToDo: move to css-media-query feature
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
                        `,
                    },
                    '/formatter.js': {
                        content: `
                            module.exports = function maxWidthAdd50Px(origSize) {
                                return "max-width: " + (Number(origSize) + Number(50)) + "px";
                            }
                        `,
                    },
                },
            });

            const rule = result.nodes[0] as postcss.AtRule;
            expect(rule.params).to.equal('max-width: 1850px');
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
                            `,
                        },
                    },
                };

                expectTransformDiagnostics(config, [
                    {
                        message: functionDiagnostics.UNKNOWN_FORMATTER(key),
                        file: '/main.st.css',
                    },
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
                            `,
                        },
                        '/formatter.js': {
                            content: `
                                module.exports = function fail() {
                                    throw new Error("FAIL FAIL FAIL");
                                }
                            `,
                        },
                    },
                };

                expectTransformDiagnostics(config, [
                    {
                        message: functionDiagnostics.FAIL_TO_EXECUTE_FORMATTER(
                            'fail(a, red, c)',
                            'FAIL FAIL FAIL'
                        ),
                        file: '/main.st.css',
                    },
                ]);
            });
        });

        describe('native', () => {
            testedNativeFunctions.forEach((cssFunc) => {
                it(`should not return a warning for native ${cssFunc} pseudo class`, () => {
                    const config = {
                        entry: '/main.css',
                        files: {
                            '/main.css': {
                                content: `
                                .myClass {
                                    background: ${cssFunc}(a, b, c);
                                }`,
                            },
                        },
                    };
                    expectTransformDiagnostics(config, []);
                });
            });
        });
    });
});
