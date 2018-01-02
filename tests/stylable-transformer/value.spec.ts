import { expect } from 'chai';
import * as postcss from 'postcss';
import { generateStylableRoot } from '../utils/generate-test-util';

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

});
