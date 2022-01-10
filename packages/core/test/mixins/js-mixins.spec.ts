import { expect } from 'chai';
import type * as postcss from 'postcss';
import {
    generateStylableRoot,
    matchAllRulesAndDeclarations,
    matchRuleAndDeclaration,
} from '@stylable/core-test-kit';

describe('Javascript Mixins', () => {
    it('javascript value', () => {
        const result = generateStylableRoot({
            entry: `/style.st.css`,
            files: {
                '/style.st.css': {
                    content: `
                    :import {
                        -st-from: "./values";
                        -st-named: myValue;
                    }
                    .container {
                        background: value(myValue);
                    }
                `,
                },
                '/values.js': {
                    content: `
                    module.exports.myValue = 'red'; 
                `,
                },
            },
        });
        const rule = result.nodes[0] as postcss.Rule;
        expect(rule.nodes[0].toString()).to.equal('background: red');
    });

    it('javascript value in var definition', () => {
        const result = generateStylableRoot({
            entry: `/style.st.css`,
            files: {
                '/style.st.css': {
                    content: `
                    :import {
                        -st-from: "./values";
                        -st-named: myValue;
                    }
                    :vars {
                        myCSSValue: value(myValue);
                    }
                    .container {
                        background: value(myCSSValue);
                    }
                `,
                },
                '/values.js': {
                    content: `
                    module.exports.myValue = 'red'; 
                `,
                },
            },
        });
        const rule = result.nodes[0] as postcss.Rule;
        expect(rule.nodes[0].toString()).to.equal('background: red');
    });

    it('javascript value does re-export to css', () => {
        const result = generateStylableRoot({
            entry: `/style.st.css`,
            files: {
                '/style.st.css': {
                    content: `
                    :import {
                        -st-from: "./x.st.css";
                        -st-named: myValue;
                    }
                    .container {
                        background: value(myValue);
                    }
                `,
                },
                '/x.st.css': {
                    content: `
                    :import {
                        -st-from: "./values";
                        -st-named: myValue;
                    }
                `,
                },
                '/values.js': {
                    content: `
                    module.exports.myValue = 'red'; 
                `,
                },
            },
        });
        const rule = result.nodes[0] as postcss.Rule;
        expect(rule.nodes[0].toString()).to.equal('background: red');
    });

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
                `,
                },
                '/mixin.js': {
                    content: `
                    module.exports = function() {
                        return {
                            color: "red"
                        }
                    }
                `,
                },
            },
        });
        const rule = result.nodes[0] as postcss.Rule;
        expect(rule.nodes[1].toString()).to.equal('color: red');
    });

    it('exported js mixin via st.css file', () => {
        const result = generateStylableRoot({
            entry: `/style.st.css`,
            files: {
                '/style.st.css': {
                    content: `
                    :import {
                        -st-from: "./index.st.css";
                        -st-named: mixin;
                    }
                    .container {
                        -st-mixin: mixin;
                    }
                `,
                },
                '/index.st.css': {
                    content: `
                    :import {
                        -st-from: "./mixin";
                        -st-default: mixin;
                    }
                `,
                },
                '/mixin.js': {
                    content: `
                    module.exports = function() {
                        return {
                            color: "red"
                        }
                    }
                `,
                },
            },
        });
        const rule = result.nodes[0] as postcss.Rule;
        expect(rule.nodes[0].toString()).to.equal('color: red');
    });

    it('exported js mixin via st.css file (with params)', () => {
        const result = generateStylableRoot({
            entry: `/style.st.css`,
            files: {
                '/style.st.css': {
                    content: `
                    :import {
                        -st-from: "./index.st.css";
                        -st-named: mixin;
                    }
                    .container {
                        -st-mixin: mixin(red, green);
                    }
                `,
                },
                '/index.st.css': {
                    content: `
                    :import {
                        -st-from: "./mixin";
                        -st-default: mixin;
                    }
                `,
                },
                '/mixin.js': {
                    content: `
                    module.exports = function(params) {
                        return {
                            color: params.join(' ')
                        }
                    }
                `,
                },
            },
        });
        const rule = result.nodes[0] as postcss.Rule;
        expect(rule.nodes[0].toString()).to.equal('color: red green');
    });

    it('simple mixin with element', () => {
        const result = generateStylableRoot({
            entry: `/style.st.css`,
            files: {
                '/style.st.css': {
                    namespace: 'style',
                    content: `
                    :import {
                        -st-from: "./mixin";
                        -st-default: mixin;
                    }
                    .container {
                        -st-mixin: mixin;
                    }
                `,
                },
                '/mixin.js': {
                    content: `
                    module.exports = function() {
                        return {
                            Test: {
                                color: "red"
                            }
                        }
                    }
                `,
                },
            },
        });

        const rule = result.nodes[1] as postcss.Rule;

        expect(rule.selector).to.equal('.style__container Test');
        expect(rule.nodes[0].toString()).to.equal('color: red');
    });

    it('simple mixin with fallback', () => {
        const result = generateStylableRoot({
            entry: `/style.st.css`,
            files: {
                '/style.st.css': {
                    namespace: 'style',
                    content: `
                    :import {
                        -st-from: "./mixin";
                        -st-default: mixin;
                    }
                    .container {
                        -st-mixin: mixin;
                    }
                `,
                },
                '/mixin.js': {
                    content: `
                    module.exports = function() {
                        return {
                            color: ["red", "blue"]
                        }
                    }
                `,
                },
            },
        });

        const rule = result.nodes[0] as postcss.Rule;

        expect(rule.selector).to.equal('.style__container');
        expect(rule.nodes[0].toString()).to.equal('color: red');
        expect(rule.nodes[1].toString()).to.equal('color: blue');
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
                `,
                },
                '/mixin.js': {
                    content: `
                    module.exports = function() {
                        return {
                            color: "red"
                        }
                    }
                `,
                },
            },
        });
        const rule = result.nodes[0] as postcss.Rule;
        expect(rule.nodes[0].toString()).to.equal('color: red');
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
                `,
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
                `,
                },
            },
        });

        const rule = result.nodes[0] as postcss.Rule;
        expect(rule.selector, 'rule 1 selector').to.equal('.entry__container');
        expect(rule.nodes[0].toString(), 'rule 1 decl').to.equal('color: red');

        const rule2 = result.nodes[1] as postcss.Rule;
        expect(rule2.selector, 'rule 2 selector').to.equal('.entry__container .entry__my-selector');
        expect(rule2.nodes[0].toString(), 'rule 2 decl').to.equal('color: green');

        const rule3 = result.nodes[2] as postcss.Rule;
        expect(rule3.selector, 'rule 3 selector').to.equal(
            '.entry__container .entry__my-selector:hover'
        );
        expect(rule3.nodes[0].toString(), 'rule 3 decl').to.equal('background: yellow');

        const rule4 = result.nodes[3] as postcss.Rule;
        expect(rule4.selector, 'rule 4 selector').to.equal('.entry__container:hover');
        expect(rule4.nodes[0].toString(), 'rule 4 decl').to.equal('color: gold');
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
                    .containerA,.containerB {
                        -st-mixin: mixin;

                    }
                `,
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
                `,
                },
            },
        });

        matchRuleAndDeclaration(result, 0, '.entry__containerA,.entry__containerB', 'color: red');

        matchRuleAndDeclaration(
            result,
            1,
            '.entry__containerA:hover,.entry__containerB:hover',
            'color: green'
        );
    });

    it('mixin with nested at-rule', () => {
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
                `,
                },
                '/mixin.js': {
                    content: `
                    module.exports = function() {
                        return {
                            "@supports not (appearance: auto)": {
                                "&": {
                                    color: "red"
                                }    
                            },
                            "&": {
                                color: "green"
                            }
                        }
                    }
                `,
                },
            },
        });

        matchRuleAndDeclaration(result, 0, '.entry__containerA', '');
        matchRuleAndDeclaration(
            result.nodes[1] as postcss.Container,
            0,
            '.entry__containerA',
            'color: red'
        );
        matchRuleAndDeclaration(result, 2, '.entry__containerA', 'color: green');
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
                `,
                },
                '/mixin.js': {
                    content: `
                    module.exports = function() {
                        return {
                            "&:hover,.class": {
                                color: "green"
                            }
                        }
                    }
                `,
                },
            },
        });

        matchRuleAndDeclaration(
            result,
            1,
            '.entry__containerA:hover,.entry__containerA .entry__class',
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
                `,
                },
                '/mixin.js': {
                    content: `
                    module.exports = function(options) {
                        return {
                            color: options[0],
                            background: options[1]
                        }
                    }
                `,
                },
            },
        });

        matchRuleAndDeclaration(result, 0, '.entry__container', 'color: red;background: blue');
    });

    it('should not root scope js mixins', () => {
        const result = generateStylableRoot({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                    :import{
                        -st-from:'./mixin.js';
                        -st-named: mixStuff;
                    }
                    .gaga{
                        color:red;
                        -st-mixin: mixStuff;
                    }
                `,
                },
                '/mixin.js': {
                    content: `
                    module.exports = {
                        mixStuff:function(){
                            return {
                                "background":"green",
                                ".child":{
                                    "color": "yellow"
                                }
                            }
                        }
                    };
                `,
                },
            },
        });

        matchRuleAndDeclaration(result, 0, '.entry__gaga', 'color:red;background:green');
        matchRuleAndDeclaration(result, 1, '.entry__gaga .entry__child', 'color:yellow');
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
                `,
                },
                '/mixin1.js': {
                    content: `
                    module.exports = function(options) {
                        return {
                            color: options[0]
                        }
                    }
                `,
                },
                '/mixin2.js': {
                    content: `
                    module.exports = function(options) {
                        return {
                            background: options[0]
                        }
                    }
                `,
                },
            },
        });

        matchRuleAndDeclaration(result, 0, '.entry__container', 'color: red;background: blue');
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
                `,
                },
                '/mixin1.js': {
                    content: `
                    module.exports = function(options) {
                        return {
                            color: options[0]
                        }
                    }
                `,
                },
            },
        });

        matchRuleAndDeclaration(result, 0, '.entry__container-a', 'color: red');

        matchRuleAndDeclaration(result, 1, '.entry__container-b', 'color: blue');
    });

    it('@keyframes mixin', () => {
        const result = generateStylableRoot({
            entry: `/style.st.css`,
            files: {
                '/style.st.css': {
                    namespace: 'entry',
                    content: `
                    :import {
                        -st-from: "./mixin";
                        -st-default: mixin;
                    }
                    .container {
                        -st-mixin: mixin;
                    }
                    @keyframes st-global(conflict) {}
                `,
                },
                '/mixin.js': {
                    content: `
                    module.exports = function() {
                        return {
                            "@keyframes unknown": {
                                "0%": { "color": "red" },
                                "100%": { "color": "green" }
                            },
                            "@keyframes conflict": {},
                            "@keyframes st-global(global-name)": {},
                            ".x": {
                                "animation-name": [
                                    "unknown",
                                    "conflict",
                                    "global-name",
                                ],
                            }
                        }
                    }
                `,
                },
            },
        });

        const {
            0: rule,
            1: unknownKeyframes,
            2: knownKeyframes,
            3: globalKeyframes,
            4: animationDeclRule,
        } = result.nodes;
        expect((rule as any).nodes.length, 'rule is empty').to.equal(0);
        if (
            unknownKeyframes.type !== 'atrule' ||
            knownKeyframes.type !== 'atrule' ||
            globalKeyframes.type !== 'atrule' ||
            animationDeclRule.type !== 'rule'
        ) {
            throw new Error('expected 3 injected to be the @keyframes');
        }
        expect(unknownKeyframes.params, 'new id').to.equal('entry__unknown');
        expect((unknownKeyframes as any).nodes[0].selector, 'first keyframe').to.equal('0%');
        expect((unknownKeyframes as any).nodes[1].selector, 'last keyframe').to.equal('100%');
        expect(knownKeyframes.params, 'existing id').to.equal('conflict');
        expect(globalKeyframes.params, 'global id').to.equal('global-name');
        expect(globalKeyframes.params, 'global id').to.equal('global-name');
        expect(
            (animationDeclRule as any).nodes[1].value,
            `conflict value - prefer stylesheet`
        ).to.equal(`conflict`);
        // ToDo: pass with mixin symbols - once mixin symbols are available in transformer
        // expect((animationDeclRule as any).nodes[0].value, `unknown value`).to.equal(
        //     `entry__unknown`
        // );
        // expect((animationDeclRule as any).nodes[2].value, `global value`).to.equal(`global-name`);
    });

    describe('url() handling', () => {
        it('should rewrite relative urls', () => {
            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./a/b/mixin1.js";
                                -st-default: mix;
                            }
                            .x {
                                -st-mixin: mix;
                            }
                        `,
                    },
                    '/a/b/mixin1.js': {
                        content: `
                        module.exports = function(options) {
                            return {
                                background: "url(./asset.png)"
                            }
                        }
                    `,
                    },
                },
            });

            matchAllRulesAndDeclarations(
                result,
                [['.entry__x', 'background: url(./a/b/asset.png)']],
                ''
            );
        });
        it('should rewrite relative urls (case2)', () => {
            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                    :import {
                        -st-from: "./a/mixin1.js";
                        -st-default: mix;
                    }
                    .x {
                        -st-mixin: mix;
                    }
                `,
                    },
                    '/a/mixin1.js': {
                        content: `
                        module.exports = function(options) {
                            return {
                                background: "url(../asset.png)"
                            }
                        }
                    `,
                    },
                },
            });

            matchAllRulesAndDeclarations(
                result,
                [['.entry__x', 'background: url(./asset.png)']],
                ''
            );
        });
    });
});
