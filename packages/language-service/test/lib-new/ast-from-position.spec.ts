/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { expect } from 'chai';
import {
    getAstNodeAt,
    type NodeType,
} from '@stylable/language-service/dist/lib-new/ast-from-position';
import { parseForEditing } from '@stylable/language-service/dist/lib-new/edit-time-parser';
import { ImmutableSelectorNode, stringifySelectorAst } from '@tokey/css-selector-parser';
import { stringifyCSSValue } from '@tokey/css-value-parser';
import { deindent } from '@stylable/core-test-kit';
import { assertRule, assertAtRule } from '../test-kit/postcss-node-asserts';

function setupWithCursor(source: string, options: { deindent?: boolean } = {}) {
    const deindented = options.deindent === false ? source : deindent(source);

    const position = deindented.indexOf(`|`);
    const parseResult = parseForEditing(deindented.split(`|`).join(``));
    return {
        position,
        parseResult,
    };
}
function assertNodes(
    nodes: NodeType[],
    expectedNodes: { str: string; desc?: string; type?: string }[]
) {
    expect(nodes.length, 'expected amount').to.eql(expectedNodes.length);
    nodes.forEach((actual, i) => {
        const expected = expectedNodes[i];
        const desc = expected.desc || i;
        const isPostCss = 'raws' in actual;
        const actualStr = isPostCss
            ? actual.toString()
            : stringifyCSSValue(actual as any) || stringifySelectorAst(actual as any);
        if (expected.type) {
            expect(actual.type, 'type ' + desc).to.eql(expected.type);
        }

        expect(actualStr, 'string compare ' + desc).to.eql(expected.str);
    });
}

describe('ast-from-position', () => {
    describe('top level', () => {
        it(`should find root (empty)`, () => {
            const { position, parseResult } = setupWithCursor(`|`);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);

            expect(base.node, 'node').to.equal(parseResult.ast);
            expect(base.offsetInNode, 'offset').to.eql(0);
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find root (whitespace)`, () => {
            const { position, parseResult } = setupWithCursor(` \t\n|\n\t `, { deindent: false });

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);

            expect(base.node, 'node').to.equal(parseResult.ast);
            expect(base.offsetInNode, 'offset').to.eql(3);
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
    });
    describe('rule', () => {
        it(`should find selector start`, () => {
            const { position, parseResult } = setupWithCursor(`
                .before {}
                |.bookmark.after {
                    prop: val;
                }
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);

            // base level
            expect(base.node.toString(), 'base target class node').to.eql(
                '.bookmark.after {\n    prop: val;\n}'
            );
            expect(base.offsetInNode, 'base offset').to.eql(0);
            // selector level
            expect(
                stringifySelectorAst(selector!.node as ImmutableSelectorNode),
                'target selector'
            ).to.eql('.bookmark.after');
            expect(selector!.afterSelector, 'after selector').to.eql(false);
            expect(selector!.offsetInNode).to.eql(0);
            assertNodes(selector!.parents, [
                {
                    desc: 'rule node',
                    str: deindent(`
                        .bookmark.after {
                            prop: val;
                        }
                    `),
                },
            ]);
            //
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find selector middle`, () => {
            const { position, parseResult } = setupWithCursor(`
                .before {}
                .before.book|mark.after {
                    prop: val;
                }
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);

            // base level
            expect(base.node.toString(), 'base target class node').to.eql(
                '.before.bookmark.after {\n    prop: val;\n}'
            );
            expect(base.offsetInNode, 'base offset').to.eql(12);
            // selector level
            expect(
                stringifySelectorAst(selector!.node as ImmutableSelectorNode),
                'target class node'
            ).to.eql('.bookmark');
            expect(selector!.afterSelector, 'after selector').to.eql(false);
            expect(selector!.offsetInNode).to.eql(5);
            assertNodes(selector!.parents, [
                {
                    desc: 'rule node',
                    str: deindent(`
                        .before.bookmark.after {
                            prop: val;
                        }
                    `),
                },
                {
                    desc: 'top selector node',
                    str: '.before.bookmark.after',
                },
            ]);
            //
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find selector (deep)`, () => {
            const { position, parseResult } = setupWithCursor(`
                .before {}
                .before:is(.targ|et.a).after {
                    decl: declValue;
                }
                .after {}
            `);

            const { selector } = getAstNodeAt(parseResult, position);

            expect(
                stringifySelectorAst(selector!.node as ImmutableSelectorNode),
                'target class node'
            ).to.eql('.target');
            expect(selector!.offsetInNode).to.eql(5);
            assertNodes(selector!.parents, [
                {
                    desc: 'rule node',
                    str: deindent(`
                        .before:is(.target.a).after {
                            decl: declValue;
                        }
                    `),
                },
                {
                    desc: 'top selector node',
                    str: '.before:is(.target.a).after',
                },
                {
                    desc: 'is() selector node',
                    str: ':is(.target.a)',
                },
                {
                    desc: 'nested selector node',
                    str: '.target.a',
                },
            ]);
        });
        it(`should find selector end`, () => {
            const { position, parseResult } = setupWithCursor(`
                .before {}
                .before.bookmark| {
                    prop: val;
                }
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);

            // base level
            expect(base.node.toString(), 'base target class node').to.eql(
                '.before.bookmark {\n    prop: val;\n}'
            );
            expect(base.offsetInNode, 'base offset').to.eql(16);
            // selector level
            expect(
                stringifySelectorAst(selector!.node as ImmutableSelectorNode),
                'target class node'
            ).to.eql('.bookmark');
            expect(selector!.afterSelector, 'after selector').to.eql(false);
            expect(selector!.offsetInNode).to.eql(9);
            assertNodes(selector!.parents, [
                {
                    desc: 'rule node',
                    str: deindent(`
                        .before.bookmark {
                            prop: val;
                        }
                    `),
                },
                {
                    desc: 'top selector node',
                    str: '.before.bookmark',
                },
            ]);
            //
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find empty selector`, () => {
            const { position, parseResult } = setupWithCursor(`
                .before {}
                | {
                    prop: val;
                }
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);

            // base level
            expect(base.node.toString(), 'base target class node').to.eql('{\n    prop: val;\n}');
            expect(base.offsetInNode, 'base offset').to.eql(-1);
            // selector level
            expect(stringifySelectorAst(selector!.node as ImmutableSelectorNode), '').to.eql('');
            expect(selector!.afterSelector, 'after selector').to.eql(false);
            expect(selector!.offsetInNode).to.eql(0);
            assertNodes(selector!.parents, [
                {
                    desc: 'rule node',
                    str: deindent(`
                        {
                            prop: val;
                        }
                    `),
                },
            ]);
            //
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find between selector and body`, () => {
            const { position, parseResult } = setupWithCursor(`
                .before {}
                .bookmark   |   {
                    prop: val;
                }
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);

            // base level
            expect(base.node.toString(), 'base target class node').to.eql(
                '.bookmark      {\n    prop: val;\n}'
            );
            expect(base.offsetInNode, 'base offset').to.eql(12);
            // selector-after level
            expect(
                stringifySelectorAst(selector!.node as ImmutableSelectorNode),
                'target selector'
            ).to.eql('.bookmark');
            expect(selector!.afterSelector, 'after selector').to.eql(true);
            expect(selector!.offsetInNode).to.eql(12);
            assertNodes(selector!.parents, [
                {
                    desc: 'rule node',
                    str: deindent(`
                        .bookmark      {
                            prop: val;
                        }
                    `),
                },
            ]);
            //
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find whitespace after selector with another selector following`, () => {
            const { position, parseResult } = setupWithCursor(`
                .before {}
                .before, .bookmark |, .after   {
                    prop: val;
                }
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);

            // base level
            expect(base.node.toString(), 'base target class node').to.eql(
                '.before, .bookmark , .after   {\n    prop: val;\n}'
            );
            expect(base.offsetInNode, 'base offset').to.eql(19);
            // selector-after level
            expect(
                stringifySelectorAst(selector!.node as ImmutableSelectorNode),
                'target selector'
            ).to.eql(' .bookmark ');
            expect(selector!.afterSelector, 'after selector').to.eql(true);
            expect(selector!.offsetInNode).to.eql(11);
            assertNodes(selector!.parents, [
                {
                    desc: 'rule node',
                    str: deindent(`
                        .before, .bookmark , .after   {
                            prop: val;
                        }
                    `),
                },
            ]);
            //
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find before declaration`, () => {
            const { position, parseResult } = setupWithCursor(`
                .before {}
                .x { | decl: declValue; }
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);

            const rule = assertRule(parseResult.ast.nodes[1]);
            expect(base.node, 'node').to.equal(rule);
            expect(base.offsetInNode, 'offset').to.eql(5);
            // ToDo: maybe offer before/after nodes
            // expect(base.beforeNode, 'beforeNode').to.eql(undefined);
            // expect(base.afterNode, 'afterNode').to.eql(rule.nodes[0]);
            //
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find between declaration`, () => {
            const { position, parseResult } = setupWithCursor(`
                .before {}
                .x { decl1: before; | decl2: after }
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);

            const rule = assertRule(parseResult.ast.nodes[1]);
            expect(base.node, 'node').to.equal(rule);
            expect(base.offsetInNode, 'offset').to.eql(20);
            //
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find after declaration`, () => {
            const { position, parseResult } = setupWithCursor(`
                .before {}
                .x { decl: before; | }
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);

            const rule = assertRule(parseResult.ast.nodes[1]);
            expect(base.node, 'node').to.equal(rule);
            expect(base.offsetInNode, 'offset').to.eql(19);
            //
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        // ToDo: comment case after selector: ".xxx/* | */{}"
    });
    describe('declaration', () => {
        it(`should find property start`, () => {
            const { position, parseResult } = setupWithCursor(`
                .selector {
                    |decl: declValue;
                }
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);

            // base level
            expect(base.node, 'node').to.equal((parseResult.ast as any).nodes[0].nodes[0]);
            expect(base.offsetInNode, 'offset').to.equal(0);
            //
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find property end`, () => {
            const { position, parseResult } = setupWithCursor(`
                .selector {
                    decl|: declValue;
                }
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);
            // base level
            expect(base.node, 'node').to.equal((parseResult.ast as any).nodes[0].nodes[0]);
            expect(base.offsetInNode, 'offset').to.equal(4);
            //
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find value start`, () => {
            const { position, parseResult } = setupWithCursor(`
                .selector {
                    decl1: |bookmark after;
                    decl2: other;
                }
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);
            // base level
            expect(base.node, 'node').to.equal((parseResult.ast as any).nodes[0].nodes[0]);
            expect(base.offsetInNode, 'offset').to.equal(7);
            // decl-value level
            expect(stringifyCSSValue(declValue!.node as any), 'target value node').to.eql(
                'bookmark'
            );
            expect(declValue!.offsetInNode).to.eql(0);
            assertNodes(declValue!.parents, [
                {
                    desc: 'value node',
                    str: 'decl1: bookmark after',
                },
            ]);
            //
            expect(selector, 'selector').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find value middle`, () => {
            const { position, parseResult } = setupWithCursor(`
                .selector {
                    decl1: before book|mark after;
                    decl2: other;
                }
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);
            // base level
            expect(base.node, 'node').to.equal((parseResult.ast as any).nodes[0].nodes[0]);
            expect(base.offsetInNode, 'offset').to.equal(18);
            // decl-value level
            expect(stringifyCSSValue(declValue!.node as any), 'target value node').to.eql(
                'bookmark'
            );
            expect(declValue!.offsetInNode).to.eql(4);
            assertNodes(declValue!.parents, [
                {
                    desc: 'value node',
                    str: 'decl1: before bookmark after',
                },
            ]);
            //
            expect(selector, 'selector').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find value (deep)`, () => {
            const { position, parseResult } = setupWithCursor(`
                .x {
                    decl: before nest(book|mark) after;
                }
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);
            // base level
            expect(base.node, 'node').to.equal((parseResult.ast as any).nodes[0].nodes[0]);
            expect(base.offsetInNode, 'offset').to.equal(22);
            // decl-value level
            expect(stringifyCSSValue(declValue!.node as any), 'target value node').to.eql(
                'bookmark'
            );
            expect(declValue!.offsetInNode).to.eql(4);
            assertNodes(declValue!.parents, [
                {
                    desc: 'value node',
                    str: 'decl: before nest(bookmark) after',
                },
                {
                    desc: 'nest node',
                    str: 'nest(bookmark)',
                },
            ]);
            //
            expect(selector, 'selector').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find value end`, () => {
            const { position, parseResult } = setupWithCursor(`
                .selector {
                    decl1: before bookmark|;
                    decl2: other;
                }
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);
            // base level
            expect(base.node, 'node').to.equal((parseResult.ast as any).nodes[0].nodes[0]);
            expect(base.offsetInNode, 'offset').to.equal(22);
            // decl-value level
            expect(stringifyCSSValue(declValue!.node as any), 'target value node').to.eql(
                'bookmark'
            );
            expect(declValue!.offsetInNode).to.eql(8);
            assertNodes(declValue!.parents, [
                {
                    desc: 'decl node',
                    str: 'decl1: before bookmark',
                },
            ]);
            //
            expect(selector, 'selector').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find after value (no ending semicolon)`, () => {
            const { position, parseResult } = setupWithCursor(`
                .selector {
                    decl1: before   |   \t
                }
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);
            // base level
            expect(base.node, 'node').to.equal((parseResult.ast as any).nodes[0].nodes[0]);
            expect(base.offsetInNode, 'offset').to.equal(16);
            // decl-value level
            expect(stringifyCSSValue(declValue!.node as any), 'target value node').to.eql('before');
            expect(declValue!.afterValue, 'after value').to.eql(true);
            expect(declValue!.offsetInNode).to.eql(9);
            assertNodes(declValue!.parents, [
                {
                    desc: 'decl node',
                    str: 'decl1: before',
                },
            ]);
            //
            expect(selector, 'selector').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
    });
    describe('at-rule', () => {
        it(`should find name start`, () => {
            const { position, parseResult } = setupWithCursor(`
                .before {}
                @|bookmark params {}
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);

            // base level
            expect(base.node.toString(), 'base target at-rule node').to.eql('@bookmark params {}');
            expect(base.offsetInNode, 'base offset').to.eql(1);
            //
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find name end`, () => {
            const { position, parseResult } = setupWithCursor(`
                .before {}
                @bookmark| params {}
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);

            // base level
            expect(base.node.toString(), 'base target at-rule node').to.eql('@bookmark params {}');
            expect(base.offsetInNode, 'base offset').to.eql(9);
            //
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find params start`, () => {
            const { position, parseResult } = setupWithCursor(`
                .before {}
                @name |bookmark after {}
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);

            // base level
            expect(base.node.toString(), 'base target at-rule node').to.eql(
                '@name bookmark after {}'
            );
            expect(base.offsetInNode, 'base offset').to.eql(6);
            // atrule-params level
            expect(stringifyCSSValue(atRuleParams!.node as any), 'target params node').to.eql(
                'bookmark'
            );
            expect(atRuleParams!.offsetInNode).to.eql(0);
            assertNodes(atRuleParams!.parents, [
                {
                    desc: 'rule node',
                    str: '@name bookmark after {}',
                },
            ]);
            //
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
        });
        it(`should find params middle`, () => {
            const { position, parseResult } = setupWithCursor(`
                .before {}
                @name before book|mark after {}
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);

            // base level
            expect(base.node.toString(), 'base target at-rule node').to.eql(
                '@name before bookmark after {}'
            );
            expect(base.offsetInNode, 'base offset').to.eql(17);
            // atrule-params level
            expect(stringifyCSSValue(atRuleParams!.node as any), 'target params node').to.eql(
                'bookmark'
            );
            expect(atRuleParams!.offsetInNode).to.eql(4);
            assertNodes(atRuleParams!.parents, [
                {
                    desc: 'rule node',
                    str: '@name before bookmark after {}',
                },
            ]);
            //
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
        });
        it(`should find params (deep)`, () => {
            const { position, parseResult } = setupWithCursor(`
                .before {}
                @name before nest(book|mark) after {}
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);

            // base level
            expect(base.node.toString(), 'base target at-rule node').to.eql(
                '@name before nest(bookmark) after {}'
            );
            expect(base.offsetInNode, 'base offset').to.eql(22);
            // atrule-params level
            expect(stringifyCSSValue(atRuleParams!.node as any), 'target params node').to.eql(
                'bookmark'
            );
            expect(atRuleParams!.offsetInNode).to.eql(4);
            assertNodes(atRuleParams!.parents, [
                {
                    desc: 'rule node',
                    str: '@name before nest(bookmark) after {}',
                },
                {
                    desc: 'nest node',
                    str: 'nest(bookmark)',
                },
            ]);
            //
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
        });
        it(`should find params end`, () => {
            const { position, parseResult } = setupWithCursor(`
                .before {}
                @name start bookmark| {}
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);

            // base level
            expect(base.node.toString(), 'base target at-rule node').to.eql(
                '@name start bookmark {}'
            );
            expect(base.offsetInNode, 'base offset').to.eql(20);
            // atrule-params level
            expect(stringifyCSSValue(atRuleParams!.node as any), 'target params node').to.eql(
                'bookmark'
            );
            expect(atRuleParams!.offsetInNode).to.eql(8);
            assertNodes(atRuleParams!.parents, [
                {
                    desc: 'rule node',
                    str: '@name start bookmark {}',
                },
            ]);
            //
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
        });
        it(`should find between params and body`, () => {
            const { position, parseResult } = setupWithCursor(`
                .before {}
                @name params   |   {}
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);

            // base level
            expect(base.node.toString(), 'base target at-rule node').to.eql('@name params      {}');
            expect(base.offsetInNode, 'base offset').to.eql(15);
            // atrule-params level
            expect(stringifyCSSValue(atRuleParams!.node as any), 'target params node').to.eql(
                'params'
            );
            expect(atRuleParams!.afterValue, 'after params value').to.eql(true);
            expect(atRuleParams!.offsetInNode).to.eql(9);
            assertNodes(atRuleParams!.parents, [
                {
                    desc: 'rule node',
                    str: '@name params      {}',
                },
            ]);
            //
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
        });
        it(`should find between params and semicolon`, () => {
            // Notice: postcss not renders semicolon when printing atrule node.
            //         It is printed correctly as part of the AST.
            const { position, parseResult } = setupWithCursor(`
                .before {}
                @name params   |   ;
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);

            // base level
            expect(base.node.toString(), 'base target at-rule node').to.eql('@name params      ');
            expect(base.offsetInNode, 'base offset').to.eql(15);
            // atrule-params level
            expect(stringifyCSSValue(atRuleParams!.node as any), 'target params node').to.eql(
                'params'
            );
            expect(atRuleParams!.afterValue, 'after params value').to.eql(true);
            expect(atRuleParams!.offsetInNode).to.eql(9);
            assertNodes(atRuleParams!.parents, [
                {
                    desc: 'rule node',
                    str: '@name params      ',
                },
            ]);
            //
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
        });
        it(`should find before declaration`, () => {
            const { position, parseResult } = setupWithCursor(`
                .before {}
                @x params{ | decl: declValue; }
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);

            const rule = assertAtRule(parseResult.ast.nodes[1]);
            expect(base.node, 'node').to.equal(rule);
            expect(base.offsetInNode, 'offset').to.eql(11);
            //
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find between declaration`, () => {
            const { position, parseResult } = setupWithCursor(`
                .before {}
                @x params { decl1: before; | decl2: after }
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);

            const rule = assertAtRule(parseResult.ast.nodes[1]);
            expect(base.node, 'node').to.equal(rule);
            expect(base.offsetInNode, 'offset').to.eql(27);
            //
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find after declaration`, () => {
            const { position, parseResult } = setupWithCursor(`
                .before {}
                @x params { decl: before; | }
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);

            const rule = assertAtRule(parseResult.ast.nodes[1]);
            expect(base.node, 'node').to.equal(rule);
            expect(base.offsetInNode, 'offset').to.eql(26);
            //
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find selector in st-scope as selector`, () => {
            const { position, parseResult } = setupWithCursor(`
                .before {}
                @st-scope .before.book|mark.after {}
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);

            // base level
            expect(base.node.toString(), 'base target at-rule node').to.eql(
                '@st-scope .before.bookmark.after {}'
            );
            expect(base.offsetInNode, 'base offset').to.eql(22);
            // atrule-params level
            expect(stringifyCSSValue(atRuleParams!.node as any), 'target params node').to.eql(
                'bookmark'
            );
            expect(atRuleParams!.offsetInNode).to.eql(4);
            assertNodes(atRuleParams!.parents, [
                {
                    desc: 'rule node',
                    str: '@st-scope .before.bookmark.after {}',
                },
            ]);
            // selector level
            expect(
                stringifySelectorAst(selector!.node as ImmutableSelectorNode),
                'target class node'
            ).to.eql('.bookmark');
            expect(selector!.afterSelector, 'after selector').to.eql(false);
            expect(selector!.offsetInNode).to.eql(5);
            assertNodes(selector!.parents, [
                {
                    desc: 'st-scope atrule node',
                    str: '@st-scope .before.bookmark.after {}',
                },
                {
                    desc: 'top selector node',
                    str: '.before.bookmark.after',
                },
            ]);
            //
            expect(declValue, 'declValue').to.eql(undefined);
        });
    });
    describe('partial source', () => {
        it(`should provide potential selector for top level invalid node`, () => {
            const { position, parseResult } = setupWithCursor(`
                .before {}
                .before.book|mark.after
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);

            // base level
            expect(base.node.toString(), 'base target class node').to.eql('.before.bookmark.after');
            expect(base.offsetInNode, 'base offset').to.eql(12);
            // selector level
            expect(
                stringifySelectorAst(selector!.node as ImmutableSelectorNode),
                'target class node'
            ).to.eql('.bookmark');
            expect(selector!.afterSelector, 'after selector').to.eql(false);
            expect(selector!.offsetInNode).to.eql(5);
            assertNodes(selector!.parents, [
                {
                    desc: 'invalid node',
                    type: 'invalid',
                    str: deindent(`
                        .before.bookmark.after
                    `),
                },
                {
                    desc: 'top selector node',
                    type: 'selector',
                    str: '.before.bookmark.after',
                },
            ]);
            //
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should provide potential selector for nested invalid node`, () => {
            const { position, parseResult } = setupWithCursor(`
                .nest {
                    book|mark
                }
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);
            // base level
            expect(base.node, 'node').to.equal((parseResult.ast as any).nodes[0].nodes[0]);
            expect(base.node.type, 'base node type').to.equal('invalid');
            expect(base.offsetInNode, 'offset').to.equal(4);
            // selector level
            expect(
                stringifySelectorAst(selector!.node as ImmutableSelectorNode),
                'target selector node'
            ).to.eql('bookmark');
            expect(selector!.afterSelector, 'after selector').to.eql(false);
            expect(selector!.offsetInNode).to.eql(4);
            assertNodes(selector!.parents, [
                {
                    desc: 'potential invalid rule',
                    type: 'invalid',
                    str: 'bookmark\n',
                },
                {
                    desc: 'top selector node',
                    type: 'selector',
                    str: 'bookmark\n',
                },
            ]);
            //
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should offer potential selector for unclosed declaration`, () => {
            const { position, parseResult } = setupWithCursor(`
                .nest {
                    color: gre|en
                }
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);
            // base level
            expect(base.node, 'node').to.equal((parseResult.ast as any).nodes[0].nodes[0]);
            expect(base.offsetInNode, 'offset').to.equal(10);
            // decl-value level
            expect(stringifyCSSValue(declValue!.node as any), 'target value node').to.eql('green');
            expect(declValue!.offsetInNode).to.eql(3);
            assertNodes(declValue!.parents, [
                {
                    desc: 'decl node',
                    type: 'decl',
                    str: 'color: green',
                },
            ]);
            // selector level
            expect(
                stringifySelectorAst(selector!.node as ImmutableSelectorNode),
                'target class node'
            ).to.eql('green');
            expect(selector!.afterSelector, 'after selector').to.eql(false);
            expect(selector!.offsetInNode).to.eql(3);
            assertNodes(selector!.parents, [
                {
                    desc: 'decl node',
                    type: 'decl',
                    str: 'color: green',
                },
                {
                    desc: 'top selector node',
                    str: 'color: green',
                },
            ]);
            //
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should provide potential selector for last invalid node (after whitespace)`, () => {
            const { position, parseResult } = setupWithCursor(`.before   |   \t`, {
                deindent: false,
            });

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parseResult, position);

            // base level
            expect(base.node.toString(), 'base target invalid node').to.eql('.before      \t');
            expect(base.offsetInNode, 'base offset').to.eql(10);
            // selector level
            expect(
                stringifySelectorAst(selector!.node as ImmutableSelectorNode),
                'target selector'
            ).to.eql('.before      \t');
            expect(selector!.afterSelector, 'after selector').to.eql(true);
            expect(selector!.offsetInNode).to.eql(10);
            assertNodes(selector!.parents, [
                {
                    desc: 'invalid node',
                    type: 'invalid',
                    str: '.before      \t',
                },
            ]);
            //
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
    });
});
