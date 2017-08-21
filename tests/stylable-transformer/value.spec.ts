import { expect } from "chai";
import * as postcss from "postcss";
import { generateStylableRoot } from "../utils/generate-test-util";

describe('Generator variables interpolation', function () {


    it('should inline value() usage with and without quotes', function () {

        var result = generateStylableRoot({
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

        const rule = <postcss.Rule>result.nodes![0];

        expect((<postcss.Declaration>rule.nodes![0]).value).to.equal('red');
        expect((<postcss.Declaration>rule.nodes![1]).value).to.equal('green');

    });


    it('should resolve value inside @media', function () {

        var result = generateStylableRoot({
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


        expect((<postcss.AtRule>result.nodes![0]).params).to.equal('(max-width: 301px)');

    });

    it('should resolve value() usage in variable declaration', function () {


        var result = generateStylableRoot({
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

        const rule = <postcss.Rule>result.nodes![0];

        expect((<postcss.Declaration>rule.nodes![0]).value).to.equal('red');


    });

    it('should resolve to recursive entry', function () {

        var result = generateStylableRoot({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :vars {
                            param2: value(param1);
                            param: value(param2);
                        }
                        .container { 
                            color: value(param);
                        }
                    `
                }
            }
        });

        const rule = <postcss.Rule>result.nodes![0];

        expect((<postcss.Declaration>rule.nodes![0]).value).to.equal('value(param1)');

    });

    it('should support imported vars', function () {

        var result = generateStylableRoot({
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
                "/imported.st.css": {
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
        const rule = <postcss.Rule>result.nodes![0];

        expect((<postcss.Declaration>rule.nodes![0]).value).to.equal('red');
        expect((<postcss.Declaration>rule.nodes![1]).value).to.equal('blue');

    });



    it('should support imported vars (deep)', function () {

        var result = generateStylableRoot({
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
                "/imported.st.css": {
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
                "/deep.st.css": {
                    namespace: 'deep',
                    content: `
                        :vars {
                            param0: red;
                        }
                    `
                }
            }
        });
        const rule = <postcss.Rule>result.nodes![0];

        expect((<postcss.Declaration>rule.nodes![0]).value).to.equal('red');
        expect((<postcss.Declaration>rule.nodes![1]).value).to.equal('blue');

    });


    xit('should resolve value() usage in mixin call', function () {
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
