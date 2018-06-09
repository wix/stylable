/* tslint:disable:max-line-length */
import { expect } from 'chai';
import * as postcss from 'postcss';
import {
    generateFromMock,
    generateStylableRoot,
    matchAllRulesAndDeclarations,
    matchRuleAndDeclaration
} from '../utils/test-utils';

describe('CSS Mixins', () => {
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

        matchRuleAndDeclaration(result, 1, '.entry--container', 'color: red');
    });

    it('transform state form imported element', () => {
        const result = generateStylableRoot({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-from: "./design.st.css";
                            -st-named: Base;
                        }
                        .y {
                           -st-mixin: Base;
                        }
                    `
                },
                '/design.st.css': {
                    namespace: 'design',
                    content: `
                        :import {
                            -st-from: "./base.st.css";
                            -st-default: Base;
                        }
                        Base{}
                    `
                },
                '/base.st.css': {
                    namespace: 'base',
                    content: `
                        .root {
                            -st-states: disabled;
                        }
                        .root:disabled {
                            color: red;
                        }
                    `
                }
            }
        });

        matchRuleAndDeclaration(result, 1, '.entry--y[data-base-disabled]', 'color: red');
    });

    it('transform state form extended root when used as mixin', () => {
        const result = generateStylableRoot({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-from: "./design.st.css";
                            -st-default: Design;
                        }
                        .y {
                           -st-mixin: Design;
                        }
                    `
                },
                '/design.st.css': {
                    namespace: 'design',
                    content: `
                        :import {
                            -st-from: "./base.st.css";
                            -st-default: Base;
                        }
                        .root {
                           -st-extends: Base;
                        }
                        .root:disabled { color: red; }
                    `
                },
                '/base.st.css': {
                    namespace: 'base',
                    content: `
                        .root {
                            -st-states: disabled;
                        }
                    `
                }
            }
        });

        matchRuleAndDeclaration(result, 1, '.entry--y[data-base-disabled]', 'color: red');
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

        matchRuleAndDeclaration(result, 2, '.entry--container', 'color: red');
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

        matchRuleAndDeclaration(result, 0, '.entry--x', 'color: red;color: red');

        matchRuleAndDeclaration(result, 1, '.entry--y', 'color: red');
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

        matchRuleAndDeclaration(result, 0, '.entry--x', 'color: red;color: red');
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

        matchRuleAndDeclaration(result, 3, '.entry--container:hover', 'color: blue');

        matchRuleAndDeclaration(
            result,
            4,
            '.entry--container .entry--my-other-class',
            'color: green'
        );
    });

    it.skip('should scope @keyframes from local mixin without duplicating the animation', () => {
        const result = generateStylableRoot({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                .my-mixin {
                    animation: original 2s;
                }
                @keyframes original {
                    0% { color: red; }
                    100% { color: green; }
                }
                .container {
                    -st-mixin: my-mixin;
                }
                `
                }
            }
        });

        matchRuleAndDeclaration(result, 2, '.entry--container', 'animation: entry--original 2s');
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

        matchRuleAndDeclaration(result, 0, '.entry--container', 'color: red');
    });

    it('apply mixin from named import (scope classes from mixin origin)', () => {
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

        matchRuleAndDeclaration(result, 0, '.entry--container', 'color: red');

        matchRuleAndDeclaration(result, 1, '.entry--container .imported--local', 'color: green');
    });

    it('apply mixin from local class with extends (scope class as root)', () => {
        const result = generateStylableRoot({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-from: "./base.st.css";
                            -st-default: Base;
                        }

                        .container {
                            -st-mixin: my-mixin;
                        }

                        .my-mixin {
                            -st-extends: Base;
                            color: red;
                        }
                        .my-mixin::part{
                            color: green;
                        }
                    `
                },
                '/base.st.css': {
                    namespace: 'base',
                    content: `.part{}`
                }
            }
        });

        matchRuleAndDeclaration(result, 0, '.entry--container', '-st-extends: Base;color: red');

        matchRuleAndDeclaration(result, 1, '.entry--container .base--part', 'color: green');
    });

    it('apply mixin from named import with extends (scope classes from mixin origin)', () => {
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
                        :import {
                            -st-from: "./base.st.css";
                            -st-default: Base;
                        }
                        .my-mixin {
                            -st-extends: Base;
                            color: red;
                        }
                        .my-mixin::part{
                            color: green;
                        }
                  `
                },
                '/base.st.css': {
                    namespace: 'base',
                    content: `.part{}`
                }
            }
        });

        matchRuleAndDeclaration(result, 0, '.entry--container', '-st-extends: Base;color: red');

        matchRuleAndDeclaration(result, 1, '.entry--container .base--part', 'color: green');
    });

    it('should apply root mixin on child class (Root mixin mode)', () => {
        const result = generateStylableRoot({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `

                        .container {
                            -st-mixin: root;
                        }

                        .class {

                        }
                    `
                }
            }
        });

        matchRuleAndDeclaration(result, 0, '.entry--container', '');

        matchRuleAndDeclaration(result, 1, '.entry--container .entry--container', '');

        matchRuleAndDeclaration(result, 2, '.entry--container .entry--class', '');

        matchRuleAndDeclaration(result, 3, '.entry--class', '');
    });

    it('apply mixin from named import with extends (scope classes from mixin origin) !! with alias jump', () => {
        const result = generateStylableRoot({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-from: "./jump.st.css";
                            -st-named: my-mixin;
                        }
                        .container {
                            -st-mixin: my-mixin;
                        }
                    `
                },
                '/jump.st.css': {
                    namespace: 'imported',
                    content: `
                        :import {
                            -st-from: "./imported.st.css";
                            -st-named: my-mixin;
                        }
                        .my-mixin {}
                        .my-mixin::part {}
                  `
                },
                '/imported.st.css': {
                    namespace: 'imported',
                    content: `
                        :import {
                            -st-from: "./base.st.css";
                            -st-default: Base;
                        }
                        .my-mixin {
                            -st-extends: Base;
                            color: red;
                        }
                        .my-mixin::part{
                            color: green;
                        }
                  `
                },
                '/base.st.css': {
                    namespace: 'base',
                    content: `.part{}`
                }
            }
        });

        matchRuleAndDeclaration(result, 0, '.entry--container', '-st-extends: Base;color: red');

        matchRuleAndDeclaration(result, 1, '.entry--container .base--part', 'color: green');
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

        matchRuleAndDeclaration(result, 1, '.entry--x .entry--x.imported--y', 'color: yellow');
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

        matchAllRulesAndDeclarations(
            result,
            [
                ['.entry--x:hover .entry--y', 'color: red'],
                [
                    '.entry--x:hover .entry--y:hover, .entry--x:hover .entry--y.entry--local:hover .entry--inner',
                    'color: green'
                ]
            ],
            '',
            2
        );
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

        matchRuleAndDeclaration(result, 0, '.entry--x', 'color: red');

        const media = result.nodes![1] as postcss.AtRule;
        expect(media.params, 'media params').to.equal('(max-width: 300px)');

        matchAllRulesAndDeclarations(
            media,
            [['.entry--x', 'color: yellow'], ['.entry--x:hover', 'color: red']],
            '@media'
        );

        matchRuleAndDeclaration(result, 2, '.entry--x:hover', 'color: blue');
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

    it('apply named mixin with extends and conflicting pseudo-element class at mixin deceleration level', () => {
        const result = generateStylableRoot({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                :import {
                    -st-from: "./imported.st.css";
                    -st-named: mixme;
                }
                .x {
                    -st-mixin: mixme;
                }
                `
                },
                '/imported.st.css': {
                    namespace: 'imported',
                    content: `
                    :import {
                        -st-from: "./comp.st.css";
                        -st-default: Comp;
                    }
                    .part {}
                    .mixme {
                        -st-extends: Comp;
                        color: red;
                    }
                    .mixme::part .part {
                        color: green;
                    }
                `
                },
                '/comp.st.css': {
                    namespace: 'comp',
                    content: `
                    .part{}
                `
                }
            }
        });
        matchRuleAndDeclaration(result, 1, '.entry--x .comp--part .imported--part', 'color: green');
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

        matchAllRulesAndDeclarations(
            result,
            [['.entry--x', ''], ['.entry--x .r--r', ''], ['.entry--x .r--r .y--y', '']],
            ''
        );
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
                        -st-from: "./a/mix.st.css";
                        -st-named: mix;
                    }
                    .x {
                        -st-mixin: mix;
                    }
                `
                    },
                    '/a/mix.st.css': {
                        namespace: 'mix',
                        content: `
                    :import {
                        -st-from: "./b/other-mix.st.css";
                        -st-named: other-mix;
                    }
                    .mix {
                        background: url(./asset.png);
                        -st-mixin: other-mix;
                    }
                `
                    },
                    '/a/b/other-mix.st.css': {
                        namespace: 'other-mix',
                        content: `
                    .other-mix {
                        background: url(./asset.png)
                    }
                `
                    }
                }
            });

            matchAllRulesAndDeclarations(
                result,
                [['.entry--x', 'background: url(./a/asset.png);background: url(./a/b/asset.png)']],
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
                        -st-from: "./a/mix.st.css";
                        -st-named: mix;
                    }
                    .x {
                        -st-mixin: mix;
                    }
                `
                    },
                    '/a/mix.st.css': {
                        namespace: 'mix',
                        content: `
                    .mix {
                        background: url(../asset.png);
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

            matchRuleAndDeclaration(
                result,
                0,
                '.entry--x',
                'border: 1px solid green;background: yellow'
            );
        });
    });
});
