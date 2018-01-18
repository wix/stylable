/* tslint:disable:max-line-length */
import { expect } from 'chai';
import * as postcss from 'postcss';
import { generateFromMock, generateStylableRoot } from '../utils/generate-test-util';

function matchRuleAndDeclaration(
    parent: postcss.Container,
    selectorIndex: number,
    selector: string,
    decl: string,
    msg?: string
) {
    const rule = parent.nodes![selectorIndex] as postcss.Rule;
    expect(rule.selector, `${msg ? msg + ' ' : ''}selector ${selectorIndex}`).to.equal(selector);
    expect(rule.nodes!.map(x => x.toString()).join(';'), `${msg ? msg + ' ' : ''}selector ${selectorIndex} first declaration`).to.equal(decl);
}

function matchAllRulesAndDeclarations(parent: postcss.Container, all: string[][], msg?: string, offset: number = 0) {
    all.forEach((_, i) => matchRuleAndDeclaration(
        parent,
        i + offset,
        _[0],
        _[1],
        msg
    ));

}

describe('Mixins', () => {

    describe('from js', () => {

        it('simple mixin', () => {

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

        it('simple mixin and remove all -st-mixins', () => {

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

        it('complex mixin', () => {

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

        it('mixin on multiple selectors', () => {

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

            matchRuleAndDeclaration(
                result,
                0,
                '.entry--containerA, .entry--containerB',
                'color: red'
            );

            matchRuleAndDeclaration(
                result,
                1,
                '.entry--containerA:hover, .entry--containerB:hover',
                'color: green'
            );

        });

        it('mixin with multiple selectors', () => {

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

            matchRuleAndDeclaration(
                result,
                1,
                '.entry--containerA:hover, .entry--containerA .entry--class',
                'color: green'
            );

        });

        it('mixin with multiple var values', () => {

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

            matchRuleAndDeclaration(
                result,
                0,
                '.entry--container',
                'color: red;background: blue'
            );

        });

        it('multiple mixins', () => {

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

            matchRuleAndDeclaration(
                result,
                0,
                '.entry--container',
                'color: red;background: blue'
            );

        });

        it('multiple same mixin', () => {

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
                        .container-a {
                            -st-mixin: mixin1(red);
                        }
                        .container-b {
                            -st-mixin: mixin1(blue);
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
                    }
                }
            });

            matchRuleAndDeclaration(
                result,
                0,
                '.entry--container-a',
                'color: red'
            );

            matchRuleAndDeclaration(
                result,
                1,
                '.entry--container-b',
                'color: blue'
            );

        });

    });

    describe('from css', () => {

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

            matchRuleAndDeclaration(
                result,
                1,
                '.entry--container',
                'color: red'
            );

        });

        it.skip('mixin with multiple rules in keyframes', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            .x {
                                color: red;
                            }
                            .x:hover {
                                color: green;
                            }

                            @keyframes my-name {

                                0% {
                                    -st-mixin: x;
                                }
                                100% {

                                }

                            }
                        `
                    }
                }
            });

            throw new Error('Test me');

        });

        it('apply simple class mixin that uses mixin itself', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                    .x {
                        color: red;
                    }
                    .y {
                        -st-mixin: x;
                    }
                    .container {
                        -st-mixin: y;
                    }
                `
                    }
                }
            });

            matchRuleAndDeclaration(
                result,
                2,
                '.entry--container',
                'color: red'
            );

        });

        it('apply simple class mixin with circular refs to the same selector', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                    .x {
                        color: red;
                        -st-mixin: y;
                    }
                    .y {
                        -st-mixin: x;
                    }
                `
                    }
                }
            });

            matchRuleAndDeclaration(
                result,
                0,
                '.entry--x',
                'color: red;color: red'
            );

            matchRuleAndDeclaration(
                result,
                1,
                '.entry--y',
                'color: red'
            );

        });

        it('apply simple class mixin with circular refs from multiple files', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./style1.st.css";
                                -st-named: y;
                            }
                            .x {
                                color: red;
                                -st-mixin: y;
                            }
                        `
                    },
                    '/style1.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./entry.st.css";
                                -st-named: x;
                            }
                            .y {
                                -st-mixin: x;
                            }
                        `
                    }
                }
            });

            matchRuleAndDeclaration(
                result,
                0,
                '.entry--x',
                'color: red;color: red'
            );

        });

        it('append complex selector that starts with the mixin name', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `

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

            matchRuleAndDeclaration(
                result,
                3,
                '.entry--container:hover',
                'color: blue'
            );

            matchRuleAndDeclaration(
                result,
                4,
                '.entry--container .entry--my-other-class',
                'color: green'
            );

        });

        it('apply class mixins from import', () => {

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

            matchRuleAndDeclaration(
                result,
                0,
                '.entry--container',
                'color: red'
            );

        });

        it('apply mixin from import (scope classes from mixin origin)', () => {

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
                    .my-mixin .local {
                        color: green;
                    }
                `
                    }
                }
            });

            matchRuleAndDeclaration(
                result,
                0,
                '.entry--container',
                'color: red'
            );

            matchRuleAndDeclaration(
                result,
                1,
                '.entry--container .imported--local',
                'color: green'
            );

        });

        it('apply mixin with two root replacements', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                    :import {
                        -st-from: "./imported.st.css";
                        -st-named: i;
                    }
                    .x {
                        -st-mixin: i;
                    }
                `
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                            .i .i.y  {
                                color: yellow;
                            }
                        `
                    }
                }
            });

            matchRuleAndDeclaration(
                result,
                1,
                '.entry--x .entry--x.imported--y',
                'color: yellow'
            );

        });

        it('apply complex mixin on complex selector', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        .i {
                            color: red;
                        }

                        .i:hover, .local:hover, .i.local:hover .inner {
                            color: green;
                        }

                        .x:hover .y {
                            -st-mixin: i;
                        }
                    `
                    }
                }
            });

            matchAllRulesAndDeclarations(result, [
                ['.entry--x:hover .entry--y', 'color: red'],
                ['.entry--x:hover .entry--y:hover, .entry--x:hover .entry--y.entry--local:hover .entry--inner', 'color: green']
            ], '', 2);

        });

        it('apply mixin with media query', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                    :import {
                        -st-from: "./imported.st.css";
                        -st-named: i;
                    }
                    .x {
                        -st-mixin: i;
                    }
                `
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                            .y {background: #000}
                            .i {color: red;}
                            @media (max-width: 300px) {
                                .y {background: #000}
                                .i {color: yellow;}
                                .i:hover {color: red;}
                            }
                            .i:hover {color: blue;}
                        `
                    }
                }
            });

            matchRuleAndDeclaration(
                result,
                0,
                '.entry--x',
                'color: red'
            );

            const media = result.nodes![1] as postcss.AtRule;
            expect(media.params, 'media params').to.equal('(max-width: 300px)');

            matchAllRulesAndDeclarations(media, [
                ['.entry--x', 'color: yellow'],
                ['.entry--x:hover', 'color: red']
            ], '@media');

            matchRuleAndDeclaration(
                result,
                2,
                '.entry--x:hover',
                'color: blue'
            );
        });

        it('apply mixin from root style sheet', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                    :import {
                        -st-from: "./imported.st.css";
                        -st-default: X;
                    }

                    .x {
                        -st-mixin: X;
                    }
                `
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                        .root {color:red;}
                        .y {color:green;}
                        @media (max-width: 100px) {
                           .root{color:yellow;}
                           .y{color:gold;}
                        }

                    `
                    }
                }
            });

            matchRuleAndDeclaration(result, 0, '.entry--x', 'color:red');
            matchRuleAndDeclaration(result, 1, '.entry--x .imported--y', 'color:green');
            const media = result.nodes![2] as postcss.AtRule;
            matchRuleAndDeclaration(media, 0, '.entry--x', 'color:yellow', '@media');
            matchRuleAndDeclaration(media, 1, '.entry--x .imported--y', 'color:gold', '@media');

        });

        it('apply mixin when rootScoping enabled', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                scopeRoot: true,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./look1.st.css";
                                -st-default: Look1;
                            }
                            .root {
                                -st-mixin: Look1(c1 yellow);
                            }
                        `
                    },
                    '/look1.st.css': {
                        namespace: 'look1',
                        content: `
                            :import {
                                -st-from: "./base.st.css";
                                -st-default: Base;
                            }
                            :vars {
                                c1: red;
                            }
                            .root {
                                -st-extends:Base;
                                color:value(c1);
                            }
                            .panel {
                                color:gold;
                            }
                            .root::label {
                                color:green;
                            }
                        `
                    },
                    '/base.st.css': {
                        namespace: 'base',
                        content: `
                            .root {}
                            .label {}
                        `
                    }
                }
            });

            matchRuleAndDeclaration(result, 0, '.entry--root', '-st-extends:Base;color:yellow');
            matchRuleAndDeclaration(result, 1, '.entry--root .look1--panel', 'color:gold');
            matchRuleAndDeclaration(result, 2, '.entry--root .base--label', 'color:green');

        });

        it('apply mixin from imported element', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./imported.st.css";
                                -st-named: X;
                            }

                            .x {
                                -st-mixin: X;
                            }
                        `
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                            X {color:green;}
                        `
                    }
                }
            });

            matchRuleAndDeclaration(result, 0, '.entry--x', 'color:green');

        });

        it('apply nested mixins', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        :import {
                            -st-from: "./r.st.css";
                            -st-default: R;
                        }
                        .x {
                            -st-mixin: R;
                        }
                    `
                    },
                    '/r.st.css': {
                        namespace: 'r',
                        content: `
                        :import {
                            -st-from: "./y.st.css";
                            -st-default: Y;
                        }
                        .r{
                            -st-mixin: Y;
                        }
                    `
                    },
                    '/y.st.css': {
                        namespace: 'y',
                        content: `
                        .y {

                        }
                    `
                    }
                }
            });

            matchAllRulesAndDeclarations(result, [
                ['.entry--x', ''],
                ['.entry--x .r--r', ''],
                ['.entry--x .r--r .y--y', '']
            ], '');

        });


        describe('Mixins with named parameters', () => {

            it('apply mixin with :vars override (local scope)', () => {

                const result = generateStylableRoot({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                :vars {
                                    color1: red;
                                }

                                .x {
                                    -st-mixin: y(color1 green);
                                }

                                .y {color:value(color1);}

                            `
                        }
                    }
                });

                matchRuleAndDeclaration(result, 0, '.entry--x', 'color:green');

            });

            it('apply mixin with :vars override with space in value', () => {

                const result = generateStylableRoot({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                :vars {
                                    border1: red;
                                }

                                .x {
                                    -st-mixin: y(border1 1px solid red);
                                }

                                .y {border:value(border1);}

                            `
                        }
                    }
                });

                matchRuleAndDeclaration(result, 0, '.entry--x', 'border:1px solid red');

            });
            it('apply mixin with :vars override', () => {

                const result = generateStylableRoot({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                :import {
                                    -st-from: "./imported.st.css";
                                    -st-named: y;
                                }

                                .x {
                                    -st-mixin: y(color1 green);
                                }
                            `
                        },
                        '/imported.st.css': {
                            namespace: 'imported',
                            content: `
                            :vars {
                                color1: red;
                            }
                            .y {color:value(color1);}
                        `
                        }
                    }
                });

                matchRuleAndDeclaration(result, 0, '.entry--x', 'color:green');

            });

            it('apply mixin with :vars multiple override', () => {

                const result = generateStylableRoot({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                .x {
                                    -st-mixin: y(color1 green, color2 yellow);
                                }

                                .y {
                                    color:value(color1);
                                    background:value(color2);
                                }
                            `
                        }
                    }
                });

                matchRuleAndDeclaration(result, 0, '.entry--x', 'color:green;background:yellow');

            });

            it('apply mixin with :vars multiple levels', () => {

                const result = generateStylableRoot({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                        :import {
                            -st-from: "./imported.st.css";
                            -st-named: y;
                        }

                        .x {
                            -st-mixin: y(color1 green, color2 yellow);
                        }
                    `
                        },
                        '/imported.st.css': {
                            namespace: 'imported',
                            content: `
                            :import {
                                -st-from: "./mixin.st.css";
                                -st-named: z;
                            }
                            :vars {
                                color1: red;
                                color2: blue;
                            }
                            .y {
                                -st-mixin: z(color3 value(color1), color4 value(color2));
                            }
                        `
                        },
                        '/mixin.st.css': {
                            namespace: 'mixin',
                            content: `
                            :vars {
                                color3: red;
                                color4: blue;
                            }
                            .z {
                                border: 1px solid value(color3);
                                background: value(color4);
                            }
                        `
                        }
                    }
                });

                matchRuleAndDeclaration(result, 0, '.entry--x', 'border: 1px solid green;background: yellow');

            });

        });

        describe('Mixins with named parameters', () => {

            it('apply mixin with :vars override (local scope)', () => {

                const result = generateStylableRoot({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                :vars {
                                    color1: red;
                                }

                                .x {
                                    -st-mixin: y(color1 green);
                                }

                                .y {color:value(color1);}

                            `
                        }
                    }
                });

                matchRuleAndDeclaration(result, 0, '.entry--x', 'color:green');

            });

            it('apply mixin with :vars override with space in value', () => {

                const result = generateStylableRoot({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                :vars {
                                    border1: red;
                                }

                                .x {
                                    -st-mixin: y(border1 1px solid red);
                                }

                                .y {border:value(border1);}

                            `
                        }
                    }
                });

                matchRuleAndDeclaration(result, 0, '.entry--x', 'border:1px solid red');

            });
            it('apply mixin with :vars override', () => {

                const result = generateStylableRoot({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                :import {
                                    -st-from: "./imported.st.css";
                                    -st-named: y;
                                }

                                .x {
                                    -st-mixin: y(color1 green);
                                }
                            `
                        },
                        '/imported.st.css': {
                            namespace: 'imported',
                            content: `
                            :vars {
                                color1: red;
                            }
                            .y {color:value(color1);}
                        `
                        }
                    }
                });

                matchRuleAndDeclaration(result, 0, '.entry--x', 'color:green');

            });

            it('apply mixin with :vars multiple override', () => {

                const result = generateStylableRoot({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                .x {
                                    -st-mixin: y(color1 green, color2 yellow);
                                }

                                .y {
                                    color:value(color1);
                                    background:value(color2);
                                }
                            `
                        }
                    }
                });

                matchRuleAndDeclaration(result, 0, '.entry--x', 'color:green;background:yellow');

            });


        });
    });
    
    describe('mixin diagnostics', () => {

        it('should not report missing function on -st-mixin directive', () => {

            const result = generateFromMock({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./imported.st.css";
                                -st-named: y;
                            }

                            .x {
                                -st-mixin: y(color1 green, color2 yellow);
                            }
                        `
                    }
                }
            });

            expect(result.meta.transformDiagnostics!.reports.length).to.equal(0);

        });
    });

});
