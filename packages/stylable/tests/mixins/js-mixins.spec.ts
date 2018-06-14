/* tslint:disable:max-line-length */
import { expect } from 'chai';
import * as postcss from 'postcss';
import {
    generateStylableRoot,
    matchAllRulesAndDeclarations,
    matchRuleAndDeclaration
} from '../utils/test-utils';

describe('Javascript Mixins', () => {
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
        expect(rule3.selector, 'rule 3 selector').to.equal(
            '.entry--container .entry--my-selector:hover'
        );
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

        matchRuleAndDeclaration(result, 0, '.entry--containerA, .entry--containerB', 'color: red');

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

        matchRuleAndDeclaration(result, 0, '.entry--container', 'color: red;background: blue');
    });

    it('should not root scope js mixins', () => {
        const result = generateStylableRoot({
            entry: `/entry.st.css`,
            scopeRoot: true,
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
                `
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
                `
                }
            }
        });

        matchRuleAndDeclaration(
            result,
            0,
            '.entry--root .entry--gaga',
            'color:red;background:green'
        );
        matchRuleAndDeclaration(
            result,
            1,
            '.entry--root .entry--gaga .entry--child',
            'color:yellow'
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

        matchRuleAndDeclaration(result, 0, '.entry--container', 'color: red;background: blue');
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

        matchRuleAndDeclaration(result, 0, '.entry--container-a', 'color: red');

        matchRuleAndDeclaration(result, 1, '.entry--container-b', 'color: blue');
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
                `
                },
                '/mixin.js': {
                    content: `
                    module.exports = function() {
                        return {
                            "@keyframes abc": {
                                "0%": { "color": "red" },
                                "100%": { "color": "green" }
                            }
                        }
                    }
                `
                }
            }
        });

        const { 0: rule, 1: keyframes } = result.nodes!;
        expect((rule as any).nodes.length, 'rule is empty').to.equal(0);
        if (keyframes.type !== 'atrule') {
            throw new Error('expected 2nd rule to be the @keyframes');
        }
        expect((keyframes as postcss.AtRule).params, 'keyframes id').to.equal('entry--abc');
        expect((keyframes as any).nodes[0].selector, 'first keyframe').to.equal('0%');
        expect((keyframes as any).nodes[1].selector, 'last keyframe').to.equal('100%');
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
                        `
                    },
                    '/a/b/mixin1.js': {
                        content: `
                        module.exports = function(options) {
                            return {
                                background: "url(./asset.png)"
                            }
                        }
                    `
                    }
                }
            });

            matchAllRulesAndDeclarations(
                result,
                [['.entry--x', 'background: url(./a/b/asset.png)']],
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
                `
                    },
                    '/a/mixin1.js': {
                        content: `
                        module.exports = function(options) {
                            return {
                                background: "url(../asset.png)"
                            }
                        }
                    `
                    }
                }
            });

            matchAllRulesAndDeclarations(
                result,
                [['.entry--x', 'background: url(./asset.png)']],
                ''
            );
        });
    });
});
