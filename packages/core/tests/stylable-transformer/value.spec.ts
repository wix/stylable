import { box, CustomValueExtension, stTypes } from '@stylable/core';
import { generateStylableResult, generateStylableRoot } from '@stylable/core-test-kit';
import { expect } from 'chai';
import * as postcss from 'postcss';

const valueParser = require('postcss-value-parser');

describe('Generator variables interpolation', () => {
    it('should inline value() usage with and without quotes', () => {
        const result = generateStylableRoot({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :vars {
                            param: "red";
                            param1: green;
                        }
                        .container {
                            color: value(param);
                            background: value(param1);
                        }
                        `
                }
            }
        });

        const rule = result.nodes![0] as postcss.Rule;

        expect((rule.nodes![0] as postcss.Declaration).value).to.equal('red');
        expect((rule.nodes![1] as postcss.Declaration).value).to.equal('green');
    });

    it('should resolve value inside @media', () => {
        const result = generateStylableRoot({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :vars {
                            xxl: "(max-width: 301px)";
                        }
                        @media value(xxl) {}
                        `
                }
            }
        });

        expect((result.nodes![0] as postcss.AtRule).params).to.equal('(max-width: 301px)');
    });

    it('should resolve value() usage in variable declaration', () => {
        const result = generateStylableRoot({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :vars {
                            param2: red;
                            param: value(param2);
                        }
                        .container {
                            color: value(param);
                        }
                    `
                }
            }
        });

        const rule = result.nodes![0] as postcss.Rule;

        expect((rule.nodes![0] as postcss.Declaration).value).to.equal('red');
    });

    it('should resolve to recursive entry', () => {
        const result = generateStylableRoot({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :vars {
                            param1: value(param2);
                            param2: value(param3);
                            param3: value(param1);
                        }
                        .container {
                            color: value(param1);
                        }
                    `
                }
            }
        });

        const rule = result.nodes![0] as postcss.Rule;

        expect((rule.nodes![0] as postcss.Declaration).value).to.equal('value(param1)');
    });

    it('should support imported vars', () => {
        const result = generateStylableRoot({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-from: './imported.st.css';
                            -st-named: param1, param2;
                        }
                        :vars {
                            param: value(param1);
                        }
                        .container {
                            color: value(param);
                            background-color: value(param2)
                        }
                    `
                },
                '/imported.st.css': {
                    namespace: 'imported',
                    content: `
                        :vars {
                            param1: red;
                            param2: blue;
                        }
                    `
                }
            }
        });
        const rule = result.nodes![0] as postcss.Rule;

        expect((rule.nodes![0] as postcss.Declaration).value).to.equal('red');
        expect((rule.nodes![1] as postcss.Declaration).value).to.equal('blue');
    });

    it('should support imported vars (deep)', () => {
        const result = generateStylableRoot({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-from: './imported.st.css';
                            -st-named: param1, param2;
                        }
                        :vars {
                            param: value(param1);
                        }
                        .container {
                            color: value(param);
                            background-color: value(param2)
                        }
                    `
                },
                '/imported.st.css': {
                    namespace: 'imported',
                    content: `
                        :import {
                            -st-from: './deep.st.css';
                            -st-named: param0;
                        }
                        :vars {
                            param1: value(param0);
                            param2: blue;
                        }
                    `
                },
                '/deep.st.css': {
                    namespace: 'deep',
                    content: `
                        :vars {
                            param0: red;
                        }
                    `
                }
            }
        });
        const rule = result.nodes![0] as postcss.Rule;

        expect((rule.nodes![0] as postcss.Declaration).value).to.equal('red');
        expect((rule.nodes![1] as postcss.Declaration).value).to.equal('blue');
    });

    xit('should resolve value() usage in mixin call', () => {
        // const env = defineStylableEnv([
        //     JS('./mixins.js', 'Mixins', {
        //         mixin(options: string[]) {
        //             return {
        //                 color: options[0],
        //             };
        //         },
        //         otherMixin(options: string[]) {
        //             return {
        //                 backgroundColor: options[0],
        //             };
        //         },
        //         noParamsMixin() {
        //             return {
        //                 borderColor: 'orange',
        //             };
        //         }
        //     }),
        //     CSS('./main.css', 'Main', `
        //         :import("./mixins.js") {
        //             -st-named: mixin, otherMixin, noParamsMixin;
        //         }
        //         :vars {
        //             param: red;
        //         }
        //         .container {
        //             -st-mixin: mixin(value(param)) noParamsMixin otherMixin(blue);
        //         }
        //     `)
        // ], {});
        // env.validate.output([
        //     '.Main__container {\n    background-color: blue\n}',
        //     '.Main__container {\n    border-color: orange\n}',
        //     '.Main__container {\n    color: red/*param*/\n}'
        // ]); // ToDo: fix order and combine into a single CSS ruleset
    });

    describe('custom stylable variables', () => {
        it('should support imported typed values from js', () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./imported.js";
                                -st-default: CustomValue;
                            }
                            :vars {
                                customValue: CustomValue();
                            }
                            .root {
                                border: value(customValue);
                            }
                        `
                    },
                    '/imported.js': {
                        namespace: 'imported',
                        content: `
                            module.exports = {
                                _kind: 'CustomValue',
                                register(id){
                                    return {
                                        evalVarAst() {

                                        },
                                        getValue() {
                                            return \`my custom value \${id}\`
                                        }
                                    }
                                }
                            }
                        `
                    }
                }
            });
            const root = meta.outputAst!.nodes![0] as postcss.Rule;

            expect((root.nodes![0] as postcss.Declaration).value).to.equal('my custom value CustomValue');
        });

        describe('stMap', () => {
            it('should support stMap type', () => {
                const { meta } = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                :vars {
                                    otherColor: red;
                                    colors: stMap(
                                        bg orange,
                                        text green
                                    );
                                }
                                .root {
                                    background-color: value(otherColor);
                                    color: value(colors, text);
                                }
                            `
                        }
                    }
                });
                const rule = meta.outputAst!.nodes![0] as postcss.Rule;

                expect((rule.nodes![0] as postcss.Declaration).value).to.equal('red');
                expect((rule.nodes![1] as postcss.Declaration).value).to.equal('green');
            });

            it('should support stMap type with deep structure', () => {
                const { meta } = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                :vars {
                                    color1: stColor(red);
                                    designs: stMap(
                                        bg green,
                                        box stMap(
                                            border 1px solid green,
                                            font monospace
                                        )
                                    );
                                }
                                .root {
                                    background-color: value(designs, bg);
                                    color: value(designs, box, border);
                                }
                            `
                        }
                    }
                });
                const rule = meta.outputAst!.nodes![0] as postcss.Rule;

                expect((rule.nodes![0] as postcss.Declaration).value).to.equal('green');
                expect((rule.nodes![1] as postcss.Declaration).value).to.equal('1px solid green');
            });

            it('should support stMap type with imported deep structure', () => {
                const { meta } = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                :import {
                                    -st-from: '/imported.st.css';
                                    -st-named: colors
                                }
                                .root {
                                    background-color: value(colors, bg);
                                    color: value(colors, text, body);
                                }
                            `
                        },
                        '/imported.st.css': {
                            namespace: 'imported',
                            content: `
                                :vars {
                                    colors: stMap(
                                        bg red,
                                        text stMap(
                                            header gold,
                                            body green
                                        )
                                    );
                                }
                            `
                        }
                    }
                });
                const rule = meta.outputAst!.nodes![0] as postcss.Rule;

                expect((rule.nodes![0] as postcss.Declaration).value).to.equal('red');
                expect((rule.nodes![1] as postcss.Declaration).value).to.equal('green');
            });

            it('should support stMap type with var usage in variable invocation', () => {
                const { meta } = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                :vars {
                                    content: text;
                                    colors: stMap(
                                        bg red,
                                        text green
                                    );
                                }
                                .root {
                                    background-color: value(colors, bg);
                                    color: value(colors, value(content));
                                }
                            `
                        }
                    }
                });
                const rule = meta.outputAst!.nodes![0] as postcss.Rule;

                expect((rule.nodes![0] as postcss.Declaration).value).to.equal('red');
                expect((rule.nodes![1] as postcss.Declaration).value).to.equal('green');
            });

            it('should support stMap type with imported var usage in variable invocation', () => {
                const { meta } = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                :import {
                                    -st-from: '/imported.st.css';
                                    -st-named: colors;
                                }
                                :vars {
                                    key: bg;
                                }
                                .root {
                                    background-color: value(colors, value(key));
                                }
                            `
                        },
                        '/imported.st.css': {
                            namespace: 'imported',
                            content: `
                                :vars {
                                    colors: stMap(
                                        bg red,
                                        text green
                                    );
                                }
                            `
                        }
                    }
                });
                const rule = meta.outputAst!.nodes![0] as postcss.Rule;
                expect((rule.nodes![0] as postcss.Declaration).value).to.equal('red');
            });

            it('should support stMap type with inner var in definition', () => {
                const { meta } = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                :vars {
                                    size: 1px;
                                    style: solid;
                                    color: green;
                                    borders: stMap(
                                        border1 2px dashed red,
                                        border2 value(size) value(style) value(color)
                                    );
                                }
                                .root {
                                    border: value(borders, border1);
                                }
                                .part {
                                    border: value(borders, border2);
                                }
                            `
                        }
                    }
                });
                const root = meta.outputAst!.nodes![0] as postcss.Rule;
                const part = meta.outputAst!.nodes![1] as postcss.Rule;

                expect((root.nodes![0] as postcss.Declaration).value).to.equal('2px dashed red');
                expect((part.nodes![0] as postcss.Declaration).value).to.equal('1px solid green');
            });
        });

        describe('stArray', () => {
            it('should support stArray type', () => {
                const { meta } = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                :vars {
                                    otherColor: red;
                                    colors: stArray(yellow, green);
                                }
                                .root {
                                    background-color: value(otherColor);
                                    border-color: value(colors, 0);
                                    color: value(colors, 1);
                                }
                            `
                        }
                    }
                });
                const rule = meta.outputAst!.nodes![0] as postcss.Rule;

                expect((rule.nodes![0] as postcss.Declaration).value).to.equal('red');
                expect((rule.nodes![1] as postcss.Declaration).value).to.equal('yellow');
                expect((rule.nodes![2] as postcss.Declaration).value).to.equal('green');
            });

            it('should support imported stArray type', () => {
                const { meta } = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                :import {
                                    -st-from: './imported.st.css';
                                    -st-named: colors;
                                }
                                .root {
                                    background-color: value(colors, 0);
                                    color: value(colors, 1);
                                }
                            `
                        },
                        '/imported.st.css': {
                            namespace: 'imported',
                            content: `
                                :vars {
                                    colors: stArray(red, green);
                                }
                            `
                        }
                    }
                });
                const rule = meta.outputAst!.nodes![0] as postcss.Rule;

                expect((rule.nodes![0] as postcss.Declaration).value).to.equal('red');
                expect((rule.nodes![1] as postcss.Declaration).value).to.equal('green');
            });
        });

        describe('complex examples', () => {
            it('should support an stMap nested inside an stArray type', () => {
                const { meta } = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                :vars {
                                    otherColor: red;
                                    borders: stArray(
                                        stMap(
                                            size 1px,
                                            style solid,
                                            color red
                                        ),
                                        stMap(
                                            size 3px,
                                            style dashed,
                                            color yellow
                                        ),
                                        stMap(
                                            size 5px,
                                            style dotted,
                                            color green
                                        )
                                    );
                                }
                                .root {
                                    border: value(borders, 0, size) value(borders, 0, style) value(borders, 0, color);
                                }
                            `
                        }
                    }
                });
                const rule = meta.outputAst!.nodes![0] as postcss.Rule;

                expect((rule.nodes![0] as postcss.Declaration).value).to.equal('1px solid red');
            });

            it('should support an stArray nested inside an stMap type', () => {
                const { meta } = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                :vars {
                                    otherColor: red;
                                    colors: stMap(
                                        reds stArray(
                                            rgb(100, 0, 0),
                                            rgb(255, 0, 0)
                                        ),
                                        greens stArray(
                                            rgb(0, 100, 0),
                                            rgb(0, 255, 0)
                                        )
                                    );
                                }
                                .root {
                                    background-color: value(colors, reds, 0);
                                    color: value(colors, reds, 1);
                                }
                            `
                        }
                    }
                });
                const rule = meta.outputAst!.nodes![0] as postcss.Rule;

                expect((rule.nodes![0] as postcss.Declaration).value).to.equal('rgb(100, 0, 0)');
                expect((rule.nodes![1] as postcss.Declaration).value).to.equal('rgb(255, 0, 0)');
            });
        });
    });

    describe('Custom type contract', () => {
        type GetCustomTypeExtensionValueType<T> = T extends CustomValueExtension<infer U>
            ? U
            : never;

        function contract<T>(
            desc: string,
            { typeDef, path }: { typeDef: string; path: string[] },
            {
                matchValue,
                match
            }: {
                matchValue(value: GetCustomTypeExtensionValueType<T>): void;
                match(value: string): void;
            }
        ) {
            describe('Api Test: ' + desc, () => {
                const valueAst = valueParser(typeDef).nodes[0];
                const typeExtension = stTypes[valueAst.value];

                it('should create a runtime value from ast', () => {
                    matchValue(typeExtension.evalVarAst(valueAst, stTypes).value);
                });
                it('should get a string value form path', () => {
                    match(
                        typeExtension.getValue(
                            path,
                            typeExtension.evalVarAst(valueAst, stTypes),
                            valueAst,
                            stTypes
                        )
                    );
                });
            });
        }

        contract(
            'basic stMap functionality',
            { typeDef: 'stMap(k1 v1, k2 v2)', path: ['k1'] },
            {
                matchValue: map => expect(map).to.eql({ k1: 'v1', k2: 'v2' }),
                match: value => expect(value).to.equal('v1')
            }
        );

        contract(
            'nested stMap functionality',
            {
                typeDef: 'stMap(k1 v1, k2 stMap(k3 v3, k4 stMap(k5 v5) ))',
                path: ['k2', 'k4', 'k5']
            },
            {
                matchValue: map =>
                    expect(map).to.deep.include({
                        k1: 'v1',
                        k2: box('stMap', {
                            k3: 'v3',
                            k4: box('stMap', {
                                k5: 'v5'
                            })
                        })
                    }),
                match: value => expect(value).to.equal('v5')
            }
        );

        contract(
            'basic stArray functionality',
            { typeDef: 'stArray(v0, v1)', path: ['1'] },
            {
                matchValue: array => expect(array).to.eql(['v0', 'v1']),
                match: value => expect(value).to.equal('v1')
            }
        );

        contract(
            'nested stArray functionality',
            { typeDef: 'stArray(v0, stArray(v1))', path: ['1', '0'] },
            {
                matchValue: array => expect(array).to.eql(['v0', box('stArray', ['v1'])]),
                match: value => expect(value).to.equal('v1')
            }
        );

        contract(
            'complex nested stArray/stMap/stArray functionality',
            { typeDef: 'stArray(v0, stMap(k2 stArray(v2))', path: ['1', 'k2', '0'] },
            {
                matchValue: array =>
                    expect(array).to.eql(['v0', box('stMap', { k2: box('stArray', ['v2']) })]),
                match: value => expect(value).to.equal('v2')
            }
        );

        contract(
            'complex nested stMap/stArray/stMap functionality',
            { typeDef: 'stMap(k0 v0, k1 stArray(v2, stMap(k3 v3)))', path: ['k1', '1', 'k3'] },
            {
                matchValue: array =>
                    expect(array).to.eql({
                        k0: 'v0',
                        k1: box('stArray', ['v2', box('stMap', {k3: 'v3'}) ])
                    }),
                match: value => expect(value).to.equal('v3')
            }
        );
    });
});
