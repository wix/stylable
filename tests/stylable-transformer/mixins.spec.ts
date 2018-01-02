import {expect} from 'chai';
import * as postcss from 'postcss';
import {generateStylableRoot} from '../utils/generate-test-util';

describe('Stylable mixins', () => {

    it('apply simple js mixin', () => {

        const result = generateStylableRoot({
            entry: `/style.st.css`,
            files: {
                '/style.st.css': {
                    content: `
                        :import {
                            -st-from: "./mixin";
                            -st-default: mixin;
                        }
                        .container {
                            background: green;
                            -st-mixin: mixin;
                            border: 0;
                        }
                    `
                },
                '/mixin.js': {
                    content: `
                        module.exports = function() {
                            return {
                                color: "red"
                            }
                        }
                    `
                }
            }
        });
        const rule = result.nodes![0] as postcss.Rule;
        expect(rule.nodes![1].toString()).to.equal('color: red');

    });

    it('apply simple js mixin and remove all -st-mixins', () => {

        const result = generateStylableRoot({
            entry: `/style.st.css`,
            files: {
                '/style.st.css': {
                    content: `
                        :import {
                            -st-from: "./mixin";
                            -st-default: mixin;
                        }
                        .container {
                            -st-mixin: mixin;
                            -st-mixin: mixin;
                            -st-mixin: mixin;
                        }
                    `
                },
                '/mixin.js': {
                    content: `
                        module.exports = function() {
                            return {
                                color: "red"
                            }
                        }
                    `
                }
            }
        });
        const rule = result.nodes![0] as postcss.Rule;
        expect(rule.nodes![0].toString()).to.equal('color: red');

    });

    it('apply complex js mixin', () => {

        const result = generateStylableRoot({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-from: "./mixin";
                            -st-default: mixin;
                        }
                        .container {
                            -st-mixin: mixin;
                            -st-mixin: mixin;
                            -st-mixin: mixin;
                        }
                        .containerB {
                            color: blue;
                        }
                    `
                },
                '/mixin.js': {
                    content: `
                        module.exports = function() {
                            return {
                                color: "red",
                                ".my-selector": {
                                    color: "green",
                                    "&:hover": {
                                        background: "yellow"
                                    }
                                },
                                "&:hover": {
                                    color: "gold"
                                }
                            }
                        }
                    `
                }
            }
        });

        const rule = result.nodes![0] as postcss.Rule;
        expect(rule.selector, 'rule 1 selector').to.equal('.entry--container');
        expect(rule.nodes![0].toString(), 'rule 1 decl').to.equal('color: red');

        const rule2 = result.nodes![1] as postcss.Rule;
        expect(rule2.selector, 'rule 2 selector').to.equal('.entry--container .entry--my-selector');
        expect(rule2.nodes![0].toString(), 'rule 2 decl').to.equal('color: green');

        const rule3 = result.nodes![2] as postcss.Rule;
        expect(rule3.selector, 'rule 3 selector').to.equal('.entry--container .entry--my-selector:hover');
        expect(rule3.nodes![0].toString(), 'rule 3 decl').to.equal('background: yellow');

        const rule4 = result.nodes![3] as postcss.Rule;
        expect(rule4.selector, 'rule 4 selector').to.equal('.entry--container:hover');
        expect(rule4.nodes![0].toString(), 'rule 4 decl').to.equal('color: gold');

    });

    it('apply js mixin on multiple selectors', () => {

        const result = generateStylableRoot({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-from: "./mixin";
                            -st-default: mixin;
                        }
                        .containerA, .containerB {
                            -st-mixin: mixin;

                        }
                    `
                },
                '/mixin.js': {
                    content: `
                        module.exports = function() {
                            return {
                                color: "red",
                                "&:hover": {
                                    color: "green"
                                }
                            }
                        }
                    `
                }
            }
        });

        const rule = result.nodes![0] as postcss.Rule;
        expect(rule.selector, 'rule 1 selector')
            .to.equal('.entry--containerA, .entry--containerB');
        expect(rule.nodes![0].toString(), 'rule 1').to.equal('color: red');

        const rule1 = result.nodes![1] as postcss.Rule;
        expect(rule1.selector, 'rule 2 selector')
            .to.equal('.entry--containerA:hover, .entry--containerB:hover');
        expect(rule1.nodes![0].toString(), 'rule 2').to.equal('color: green');

    });

    it('apply js mixin with multiple selectors', () => {

        const result = generateStylableRoot({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-from: "./mixin";
                            -st-default: mixin;
                        }
                        .containerA {
                            -st-mixin: mixin;
                        }
                    `
                },
                '/mixin.js': {
                    content: `
                        module.exports = function() {
                            return {
                                "&:hover, .class": {
                                    color: "green"
                                }
                            }
                        }
                    `
                }
            }
        });

        const rule1 = result.nodes![1] as postcss.Rule;
        expect(rule1.selector, 'rule 2 selector')
            .to.equal('.entry--containerA:hover, .entry--containerA .entry--class');
        expect(rule1.nodes![0].toString(), 'rule 2').to.equal('color: green');

    });

    it('apply js mixin with multiple var values', () => {

        const result = generateStylableRoot({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-from: "./mixin";
                            -st-default: mixin;
                        }
                        :vars {
                            color1: red;
                            color2: blue;
                        }
                        .container {
                            -st-mixin: mixin(value(color1), value(color2));
                        }
                    `
                },
                '/mixin.js': {
                    content: `
                        module.exports = function(options) {
                            return {
                                color: options[0],
                                background: options[1]
                            }
                        }
                    `
                }
            }
        });

        const rule = result.nodes![0] as postcss.Rule;
        expect(rule.selector, 'rule 1 selector').to.equal('.entry--container');
        expect(rule.nodes![0].toString(), 'decl 1').to.equal('color: red');
        expect(rule.nodes![1].toString(), 'decl 2').to.equal('background: blue');

    });

    it('apply js multiple mixins', () => {

        const result = generateStylableRoot({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-from: "./mixin1";
                            -st-default: mixin1;
                        }
                        :import {
                            -st-from: "./mixin2";
                            -st-default: mixin2;
                        }
                        .container {
                            -st-mixin: mixin1(red) mixin2(blue);
                        }
                    `
                },
                '/mixin1.js': {
                    content: `
                        module.exports = function(options) {
                            return {
                                color: options[0]
                            }
                        }
                    `
                },
                '/mixin2.js': {
                    content: `
                        module.exports = function(options) {
                            return {
                                background: options[0]
                            }
                        }
                    `
                }
            }
        });

        const rule = result.nodes![0] as postcss.Rule;
        expect(rule.selector, 'rule 1 selector').to.equal('.entry--container');
        expect(rule.nodes![0].toString(), 'decl 1').to.equal('color: red');
        expect(rule.nodes![1].toString(), 'decl 2').to.equal('background: blue');

    });

    describe('class mixins', () => {

        it('apply simple class mixins declarations', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        .my-mixin {
                            color: red;
                        }
                        .container {
                            -st-mixin: my-mixin;
                        }
                    `
                    }
                }
            });

            const rule = result.nodes![1] as postcss.Rule;
            expect(rule.selector, 'selector').to.equal('.entry--container');
            expect(rule.nodes![0].toString(), 'decl 1').to.equal('color: red');

        });

        it('append complex selector that starts with the mixin name', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        .my-mixin {
                            color: red;
                        }
                        .my-mixin:hover {
                            color: blue;
                        }
                        .my-mixin .my-other-class {
                            color: green;
                        }
                        .container {
                            -st-mixin: my-mixin;
                        }
                    `
                    }
                }
            });

            const rule = result.nodes![4] as postcss.Rule;
            expect(rule.selector, 'selector').to.equal('.entry--container:hover');
            expect(rule.nodes![0].toString(), 'selector decl').to.equal('color: blue');

            const rule2 = result.nodes![5] as postcss.Rule;
            expect(rule2.selector, 'selector 2').to.equal('.entry--container .entry--my-other-class');
            expect(rule2.nodes![0].toString(), 'selector 2 decl').to.equal('color: green');

        });

        it('apply simple class mixins declarations from import', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        :import {
                            -st-from: "./imported.st.css";
                            -st-named: my-mixin;
                        }
                        .container {
                            -st-mixin: my-mixin;
                        }
                    `
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                        .my-mixin {
                            color: red;
                        }
                    `
                    }
                }
            });

            const rule = result.nodes![0] as postcss.Rule;
            expect(rule.selector, 'selector').to.equal('.entry--container');
            expect(rule.nodes![0].toString(), 'decl 1').to.equal('color: red');

        });
    });

});
