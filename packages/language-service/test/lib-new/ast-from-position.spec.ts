import { expect } from 'chai';
import {
    getAstNodeAt,
    type NodeType,
    AstLocationResult,
} from '@stylable/language-service/dist/lib-new/ast-from-position';
import { parseForEditing } from '@stylable/language-service/dist/lib-new/edit-time-parser';
import { stringifySelectorAst } from '@tokey/css-selector-parser';
import { stringifyCSSValue } from '@tokey/css-value-parser';
import { deindent } from '@stylable/core-test-kit';
import { assertRule } from '../test-kit/postcss-node-asserts';

function setupWithCursor(source: string, options: { deindent?: boolean } = {}) {
    const deindented = options.deindent === false ? source : deindent(source);

    const position = deindented.indexOf(`|`);
    const parsed = parseForEditing(deindented.split(`|`).join(``));
    return {
        position,
        parsed,
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
        const actualStr = stringifyResultAst(actual);
        if (expected.type) {
            if ('type' in actual) {
                expect(actual.type, 'type ' + desc).to.eql(expected.type);
            } else {
                throw new Error(`expected node.type`);
            }
        }

        expect(actualStr, 'string compare ' + desc).to.eql(expected.str);
    });
}
function stringifyResultAst(node: NodeType | NodeType[]): string {
    if (Array.isArray(node)) {
        return node.map(stringifyResultAst).join('');
    }
    const isPostCss = 'raws' in node;
    return isPostCss
        ? node.toString()
        : stringifyCSSValue(node as any) || stringifySelectorAst(node as any);
}
function expectAstLocation(
    actual: NonNullable<AstLocationResult[keyof AstLocationResult]>,
    expectation: {
        node?: NodeType;
        stringify?: string;
        deindent?: boolean;
        where?: string;
        parents?: { str: string; desc?: string; type?: string }[];
    }
) {
    if (expectation.node) {
        expect(actual.node, 'node').to.equal(expectation.node);
    }
    if (expectation.where) {
        if ('where' in actual) {
            expect(actual.where, 'where').to.equal(expectation.where);
        } else {
            throw new Error(`expected where="${expectation.where}"`);
        }
    }
    if (expectation.stringify) {
        const disableDeindent =
            expectation.deindent === false || !expectation.stringify.includes('\n');
        const expectedSource = disableDeindent
            ? expectation.stringify
            : deindent(expectation.stringify);
        let caretOffset = actual.offsetInNode;
        let stringified = stringifyResultAst(actual.node);
        if (expectedSource.includes('|')) {
            // naively add spaces for cases where postcss keeps the initial spaces in the before
            if (caretOffset < 0) {
                stringified = stringified.padStart(-1 * caretOffset + stringified.length, ' ');
                caretOffset = 0;
            } else if (caretOffset > stringified.length) {
                stringified = stringified.padEnd(caretOffset, ' ');
            }
            const withCaret =
                stringified.slice(0, caretOffset) + '|' + stringified.slice(caretOffset);
            expect(withCaret, 'stringify (with caret)').to.equal(expectedSource);
        } else {
            expect(stringified, 'stringify (with caret)').to.equal(expectedSource);
        }
    }
    if (expectation.parents) {
        if ('parents' in actual) {
            assertNodes(actual.parents, expectation.parents);
        } else {
            throw new Error(`expected parents`);
        }
    }
}
/**
 * these tests sometimes have before/after the actual source that is being tested
 * in order to verify that offsets are being calculated correctly.
 */
describe('ast-from-position', () => {
    describe('top level', () => {
        it(`should find root (empty)`, () => {
            const { position, parsed } = setupWithCursor(`|`);

            const result = getAstNodeAt(parsed, position);

            expectAstLocation(result.base, {
                node: parsed.ast,
                where: 'root',
                stringify: '|',
            });
            expect(result.selector, 'selector').to.eql(undefined);
            expect(result.declValue, 'declValue').to.eql(undefined);
            expect(result.atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find root (whitespace)`, () => {
            const { position, parsed } = setupWithCursor(` \t\n|\n\t `, { deindent: false });

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);

            expectAstLocation(base, {
                node: parsed.ast,
                where: 'root',
                stringify: ' \t\n|\n\t ',
                deindent: false,
            });
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find comment`, () => {
            const { position, parsed } = setupWithCursor(`.before{}/*comment|*/.after{}`);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);

            expectAstLocation(base, {
                node: parsed.ast.nodes[1],
                where: 'comment',
                stringify: '/*comment|*/',
            });
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
    });
    describe('rule', () => {
        it(`should find selector start`, () => {
            const { position, parsed } = setupWithCursor(`
                .before {}
                |.bookmark.after {
                    prop: val;
                }
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);

            // base level
            expectAstLocation(base, {
                node: parsed.ast.nodes[1],
                where: 'ruleSelector',
                stringify: `
                    |.bookmark.after {
                        prop: val;
                    }
                `,
            });
            // selector level
            expectAstLocation(selector!, {
                stringify: `|.bookmark.after`,
                parents: [
                    {
                        desc: 'rule node',
                        str: deindent(`
                            .bookmark.after {
                                prop: val;
                            }
                        `),
                    },
                ],
            });
            expect(selector!.afterSelector, 'after selector').to.eql(false);
            // unresolved levels
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find selector middle`, () => {
            const { position, parsed } = setupWithCursor(`
                .before {}
                .before.book|mark.after {
                    prop: val;
                }
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);

            // base level
            expectAstLocation(base, {
                node: parsed.ast.nodes[1],
                where: 'ruleSelector',
                stringify: `
                    .before.book|mark.after {
                        prop: val;
                    }
                `,
            });
            // selector level
            expectAstLocation(selector!, {
                stringify: `.book|mark`,
                parents: [
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
                ],
            });
            expect(selector!.afterSelector, 'after selector').to.eql(false);
            // unresolved levels
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find selector (deep)`, () => {
            const { position, parsed } = setupWithCursor(`
                .before {}
                .before:is(.targ|et.a).after {
                    decl: declValue;
                }
                .after {}
            `);

            const { base, selector } = getAstNodeAt(parsed, position);

            // base level
            expectAstLocation(base, {
                node: parsed.ast.nodes[1],
                where: 'ruleSelector',
            });
            // selector level
            expectAstLocation(selector!, {
                stringify: `.targ|et`,
                parents: [
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
                ],
            });
        });
        it(`should find selector end`, () => {
            const { position, parsed } = setupWithCursor(`
                .before {}
                .before.bookmark| {
                    prop: val;
                }
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);

            // base level
            expectAstLocation(base, {
                node: parsed.ast.nodes[1],
                where: 'ruleSelector',
                stringify: `
                    .before.bookmark| {
                        prop: val;
                    }
                `,
            });
            // selector level
            expectAstLocation(selector!, {
                stringify: `.bookmark|`,
                parents: [
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
                ],
            });
            expect(selector!.afterSelector, 'after selector').to.eql(false);
            // unresolved levels
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find empty selector`, () => {
            const { position, parsed } = setupWithCursor(`
                .before {}
                | {
                    prop: val;
                }
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);

            // base level
            expectAstLocation(base, {
                node: parsed.ast.nodes[1],
                where: 'ruleBetweenSelectorAndBody',
                stringify: `
                    | {
                        prop: val;
                    }
                `,
            });
            // selector level
            expectAstLocation(selector!, {
                stringify: `|`,
                parents: [
                    {
                        desc: 'rule node',
                        str: deindent(`
                            {
                                prop: val;
                            }
                        `),
                    },
                ],
            });
            expect(selector!.afterSelector, 'after selector').to.eql(false);
            // unresolved levels
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find between selector and body`, () => {
            const { position, parsed } = setupWithCursor(`
                .before {}
                .bookmark   |   {
                    prop: val;
                }
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);

            // base level
            expectAstLocation(base, {
                node: parsed.ast.nodes[1],
                where: 'ruleBetweenSelectorAndBody',
                stringify: `
                    .bookmark   |   {
                        prop: val;
                    }
                `,
            });
            // selector-after level
            expectAstLocation(selector!, {
                stringify: `.bookmark   |`,
                parents: [
                    {
                        desc: 'rule node',
                        str: deindent(`
                            .bookmark      {
                                prop: val;
                            }
                        `),
                    },
                ],
            });
            expect(selector!.afterSelector, 'after selector').to.eql(true);
            // unresolved levels
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find whitespace after selector with another selector following`, () => {
            const { position, parsed } = setupWithCursor(`
                .before {}
                .before, .bookmark |, .after   {
                    prop: val;
                }
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);

            // base level
            expectAstLocation(base, {
                where: 'ruleSelector',
                stringify: `
                    .before, .bookmark |, .after   {
                        prop: val;
                    }
                `,
            });
            // selector-after level
            expectAstLocation(selector!, {
                stringify: ` .bookmark |`,
                parents: [
                    {
                        desc: 'rule node',
                        str: deindent(`
                            .before, .bookmark , .after   {
                                prop: val;
                            }
                        `),
                    },
                ],
            });
            expect(selector!.afterSelector, 'after selector').to.eql(true);
            // unresolved levels
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find before declaration`, () => {
            const { position, parsed } = setupWithCursor(`
                .before {}
                .x { | decl: declValue; }
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);

            // base level
            expectAstLocation(base, {
                node: assertRule(parsed.ast.nodes[1]),
                where: 'ruleBody',
                stringify: `.x { | decl: declValue; }`,
            });
            // ToDo: maybe offer before/after nodes
            // expect(base.beforeNode, 'beforeNode').to.eql(undefined);
            // expect(base.afterNode, 'afterNode').to.eql(rule.nodes[0]);
            // unresolved levels
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find between declaration`, () => {
            const { position, parsed } = setupWithCursor(`
                .before {}
                .x { decl1: before; | decl2: after }
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);

            // base level
            expectAstLocation(base, {
                node: assertRule(parsed.ast.nodes[1]),
                where: 'ruleBody',
                stringify: `.x { decl1: before; | decl2: after }`,
            });
            // unresolved levels
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find after declaration`, () => {
            const { position, parsed } = setupWithCursor(`
                .before {}
                .x { decl: before; | }
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);

            // base level
            expectAstLocation(base, {
                node: assertRule(parsed.ast.nodes[1]),
                where: 'ruleBody',
                stringify: `.x { decl: before; | }`,
            });
            // unresolved levels
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        // ToDo: comment case after selector: ".xxx/* | */{}"
    });
    describe('declaration', () => {
        it(`should find property start`, () => {
            const { position, parsed } = setupWithCursor(`
                .selector {
                    |decl: declValue;
                }
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);

            // base level
            expectAstLocation(base, {
                node: (parsed.ast as any).nodes[0].nodes[0],
                where: 'declProp',
                stringify: `|decl: declValue`,
            });
            // unresolved levels
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find property end`, () => {
            const { position, parsed } = setupWithCursor(`
                .selector {
                    decl|: declValue;
                }
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);
            // base level
            expectAstLocation(base, {
                node: (parsed.ast as any).nodes[0].nodes[0],
                where: 'declProp',
                stringify: `decl|: declValue`,
            });
            // unresolved levels
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find position between property and colon`, () => {
            const { position, parsed } = setupWithCursor(`
                .selector {
                    decl | : declValue;
                }
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);
            // base level
            expectAstLocation(base, {
                node: (parsed.ast as any).nodes[0].nodes[0],
                where: 'declBetweenPropAndColon',
                stringify: `decl | : declValue`,
            });
            // unresolved levels
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find position between colon and value`, () => {
            const { position, parsed } = setupWithCursor(`
                .selector {
                    decl: | declValue;
                }
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);
            // base level
            expectAstLocation(base, {
                node: (parsed.ast as any).nodes[0].nodes[0],
                where: 'declValue',
                stringify: `decl: | declValue`,
            });
            // decl-value level
            expectAstLocation(declValue!, {
                stringify: ' | ',
                parents: [
                    {
                        desc: 'decl',
                        str: 'decl:  declValue',
                    },
                ],
            });
            // unresolved levels
            expect(selector, 'selector').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find value start`, () => {
            const { position, parsed } = setupWithCursor(`
                .selector {
                    decl1: |bookmark after ;
                    decl2: other;
                }
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);
            // base level
            expectAstLocation(base, {
                node: (parsed.ast as any).nodes[0].nodes[0],
                where: 'declValue',
                stringify: `decl1: |bookmark after `,
            });
            // decl-value level
            expect(stringifyCSSValue(declValue!.ast), 'value ast').to.eql(' bookmark after ');
            expectAstLocation(declValue!, {
                stringify: ' |',
                parents: [
                    {
                        desc: 'value node',
                        str: 'decl1: bookmark after ',
                    },
                ],
            });
            // unresolved levels
            expect(selector, 'selector').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find value middle`, () => {
            const { position, parsed } = setupWithCursor(`
                .selector {
                    decl1: before book|mark after;
                    decl2: other;
                }
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);
            // base level
            expectAstLocation(base, {
                node: (parsed.ast as any).nodes[0].nodes[0],
                where: 'declValue',
                stringify: `decl1: before book|mark after`,
            });
            // decl-value level
            expect(stringifyCSSValue(declValue!.ast), 'value ast').to.eql(' before bookmark after');
            expectAstLocation(declValue!, {
                stringify: 'book|mark',
                parents: [
                    {
                        desc: 'value node',
                        str: 'decl1: before bookmark after',
                    },
                ],
            });
            // unresolved levels
            expect(selector, 'selector').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find value (deep)`, () => {
            const { position, parsed } = setupWithCursor(`
                .x {
                    decl: before nest(book|mark) after;
                }
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);
            // base level
            expectAstLocation(base, {
                node: (parsed.ast as any).nodes[0].nodes[0],
                where: 'declValue',
                stringify: `decl: before nest(book|mark) after`,
            });
            // decl-value level
            expect(stringifyCSSValue(declValue!.ast), 'value ast').to.eql(
                ' before nest(bookmark) after'
            );
            expectAstLocation(declValue!, {
                stringify: 'book|mark',
                parents: [
                    {
                        desc: 'value node',
                        str: 'decl: before nest(bookmark) after',
                    },
                    {
                        desc: 'nest node',
                        str: 'nest(bookmark)',
                    },
                ],
            });
            // unresolved levels
            expect(selector, 'selector').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find value end`, () => {
            const { position, parsed } = setupWithCursor(`
                .selector {
                    decl1: before bookmark| ;
                    decl2: other;
                }
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);
            // base level
            expectAstLocation(base, {
                node: (parsed.ast as any).nodes[0].nodes[0],
                where: 'declValue',
                stringify: `decl1: before bookmark| `,
            });
            // decl-value level
            expect(stringifyCSSValue(declValue!.ast), 'value ast').to.eql(' before bookmark ');
            expectAstLocation(declValue!, {
                stringify: 'bookmark|',
                parents: [
                    {
                        desc: 'decl node',
                        str: 'decl1: before bookmark ',
                    },
                ],
            });
            // unresolved levels
            expect(selector, 'selector').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find after value (no ending semicolon)`, () => {
            const { position, parsed } = setupWithCursor(`
                .selector {
                    decl1: before   |   \t
                }
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);
            // base level
            expectAstLocation(base, {
                node: (parsed.ast as any).nodes[0].nodes[0],
                where: 'declValue',
                stringify: `decl1: before   |`,
            });
            // decl-value level
            expect(stringifyCSSValue(declValue!.ast), 'value ast').to.eql(' before      \t\n');
            expectAstLocation(declValue!, {
                stringify: '   |   \t\n',
                deindent: false,
                parents: [
                    {
                        desc: 'decl node',
                        // postcss stringify doesn't show unclosed after spaces on decl
                        // they belong in parent rule raws after
                        str: 'decl1: before',
                    },
                ],
            });
            // unresolved levels
            expect(selector, 'selector').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
    });
    describe('at-rule', () => {
        it(`should find name start`, () => {
            const { position, parsed } = setupWithCursor(`
                .before {}
                @|bookmark params {}
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);

            // base level
            expectAstLocation(base, {
                stringify: '@|bookmark params {}',
                where: 'atRuleName',
            });
            // unresolved levels
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find name end`, () => {
            const { position, parsed } = setupWithCursor(`
                .before {}
                @bookmark| params {}
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);

            // base level
            expectAstLocation(base, {
                stringify: '@bookmark| params {}',
                where: 'atRuleName',
            });
            // at-rule-params level
            expect(stringifyCSSValue(atRuleParams!.ast), 'params ast').to.eql(' params ');
            expectAstLocation(atRuleParams!, {
                stringify: '| ',
                parents: [
                    {
                        desc: 'atRule node',
                        str: '@bookmark params {}',
                    },
                ],
            });
            // unresolved levels
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
        });
        it(`should find between name and params (pre param whitespace)`, () => {
            const { position, parsed } = setupWithCursor(`
                @name | params {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);

            // base level
            expectAstLocation(base, {
                stringify: '@name | params {}',
                where: 'atRuleParams',
            });
            // atrule-params level
            expect(stringifyCSSValue(atRuleParams!.ast), 'params ast').to.eql('  params ');
            expectAstLocation(atRuleParams!, {
                stringify: ' | ',
                parents: [
                    {
                        desc: 'atRule node',
                        str: '@name  params {}',
                    },
                ],
            });
            // unresolved levels
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
        });
        it(`should find params start`, () => {
            const { position, parsed } = setupWithCursor(`
                .before {}
                @name |bookmark after {}
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);

            // base level
            expectAstLocation(base, {
                stringify: '@name |bookmark after {}',
                where: 'atRuleParams',
            });
            // atrule-params level
            expect(stringifyCSSValue(atRuleParams!.ast), 'params ast').to.eql(' bookmark after ');
            expectAstLocation(atRuleParams!, {
                stringify: ' |',
                parents: [
                    {
                        desc: 'rule node',
                        str: '@name bookmark after {}',
                    },
                ],
            });
            // unresolved levels
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
        });
        it(`should find params middle`, () => {
            const { position, parsed } = setupWithCursor(`
                .before {}
                @name before book|mark after {}
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);

            // base level
            expectAstLocation(base, {
                stringify: '@name before book|mark after {}',
                where: 'atRuleParams',
            });
            // atrule-params level
            expect(stringifyCSSValue(atRuleParams!.ast), 'params ast').to.eql(
                ' before bookmark after '
            );
            expectAstLocation(atRuleParams!, {
                stringify: 'book|mark',
                parents: [
                    {
                        desc: 'rule node',
                        str: '@name before bookmark after {}',
                    },
                ],
            });
            // unresolved levels
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
        });
        it(`should find params (deep)`, () => {
            const { position, parsed } = setupWithCursor(`
                .before {}
                @name before nest(book|mark) after {}
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);

            // base level
            expectAstLocation(base, {
                stringify: '@name before nest(book|mark) after {}',
                where: 'atRuleParams',
            });
            // atrule-params level
            expect(stringifyCSSValue(atRuleParams!.ast), 'params ast').to.eql(
                ' before nest(bookmark) after '
            );
            expectAstLocation(atRuleParams!, {
                stringify: 'book|mark',
                parents: [
                    {
                        desc: 'rule node',
                        str: '@name before nest(bookmark) after {}',
                    },
                    {
                        desc: 'nest node',
                        str: 'nest(bookmark)',
                    },
                ],
            });
            // unresolved levels
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
        });
        it(`should find params end`, () => {
            const { position, parsed } = setupWithCursor(`
                .before {}
                @name start bookmark| {}
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);

            // base level
            expectAstLocation(base, {
                stringify: '@name start bookmark| {}',
                where: 'atRuleParams',
            });
            // atrule-params level
            expect(stringifyCSSValue(atRuleParams!.ast), 'params ast').to.eql(' start bookmark ');
            expectAstLocation(atRuleParams!, {
                stringify: 'bookmark|',
                parents: [
                    {
                        desc: 'rule node',
                        str: '@name start bookmark {}',
                    },
                ],
            });
            // unresolved levels
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
        });
        it(`should find between params and body`, () => {
            const { position, parsed } = setupWithCursor(`
                .before {}
                @name params   |   {}
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);

            // base level
            expectAstLocation(base, {
                stringify: '@name params   |   {}',
                where: 'atRuleParams',
            });
            // atrule-params level
            expectAstLocation(atRuleParams!, {
                stringify: '   |   ',
                parents: [
                    {
                        desc: 'rule node',
                        str: '@name params      {}',
                    },
                ],
            });
            // unresolved levels
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
        });
        it(`should find between params and semicolon`, () => {
            // Notice: postcss not renders semicolon when printing atrule node.
            //         It is printed correctly as part of the AST.
            const { position, parsed } = setupWithCursor(`
                .before {}
                @name params   |   ;
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);

            // base level
            expectAstLocation(base, {
                stringify: '@name params   |   ',
                where: 'atRuleParams',
            });
            // atrule-params level
            expectAstLocation(atRuleParams!, {
                stringify: '   |   ',
                parents: [
                    {
                        desc: 'rule node',
                        str: '@name params      ',
                    },
                ],
            });
            // unresolved levels
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
        });
        it(`should find between params and unclosed end`, () => {
            const { position, parsed } = setupWithCursor(`@name params   |   \n\t`, {
                deindent: false,
            });

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);

            // base level
            expectAstLocation(base, {
                stringify: '@name params   |',
                deindent: false,
                where: 'atRuleParams',
            });
            // atrule-params level
            expect(stringifyCSSValue(atRuleParams!.ast), 'params ast').to.eql(' params      \n\t');
            expectAstLocation(atRuleParams!, {
                stringify: '   |   \n\t',
                deindent: false,
                parents: [
                    {
                        desc: 'rule node',
                        str: '@name params',
                    },
                ],
            });
            // unresolved levels
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
        });
        it(`should find before declaration`, () => {
            const { position, parsed } = setupWithCursor(`
                .before {}
                @x params{ | decl: declValue; }
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);

            // base level
            expectAstLocation(base, {
                node: parsed.ast.nodes[1],
                where: 'atRuleBody',
                stringify: '@x params{ | decl: declValue; }',
            });
            // unresolved levels
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find between declaration`, () => {
            const { position, parsed } = setupWithCursor(`
                .before {}
                @x params { decl1: before; | decl2: after }
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);

            // base level
            expectAstLocation(base, {
                node: parsed.ast.nodes[1],
                where: 'atRuleBody',
                stringify: '@x params { decl1: before; | decl2: after }',
            });
            // unresolved levels
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find after declaration`, () => {
            const { position, parsed } = setupWithCursor(`
                .before {}
                @x params { decl: before; | }
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);

            // base level
            expectAstLocation(base, {
                node: parsed.ast.nodes[1],
                where: 'atRuleBody',
                stringify: '@x params { decl: before; | }',
            });
            // unresolved levels
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should find selector in st-scope as selector`, () => {
            const { position, parsed } = setupWithCursor(`
                .before {}
                @st-scope .before.book|mark.after {}
                .after {}
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);

            // base level
            expectAstLocation(base, {
                stringify: '@st-scope .before.book|mark.after {}',
                where: 'atRuleParams',
            });
            // atrule-params level
            expectAstLocation(atRuleParams!, {
                stringify: 'book|mark',
                parents: [
                    {
                        desc: 'rule node',
                        str: '@st-scope .before.bookmark.after {}',
                    },
                ],
            });
            // selector level
            expect(selector!.afterSelector, 'after selector').to.eql(false);
            expectAstLocation(selector!, {
                stringify: '.book|mark',
                parents: [
                    {
                        desc: 'st-scope atrule node',
                        str: '@st-scope .before.bookmark.after {}',
                    },
                    {
                        desc: 'top selector node',
                        str: '.before.bookmark.after',
                    },
                ],
            });
            // unresolved levels
            expect(declValue, 'declValue').to.eql(undefined);
        });
    });
    describe('partial source', () => {
        it(`should provide potential selector for top level invalid node`, () => {
            const { position, parsed } = setupWithCursor(`
                .before {}
                .before.book|mark.after
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);

            // base level
            expectAstLocation(base, {
                stringify: '.before.book|mark.after',
                where: 'invalid',
            });

            // selector level
            expect(selector!.afterSelector, 'after selector').to.eql(false);
            expectAstLocation(selector!, {
                stringify: '.book|mark',
                parents: [
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
                ],
            });
            // unresolved levels
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should provide potential selector for nested invalid node`, () => {
            const { position, parsed } = setupWithCursor(`
                .nest {
                    book|mark
                }
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);
            // base level
            expect(base.node.type, 'base node type').to.equal('invalid');
            expectAstLocation(base, {
                node: (parsed.ast as any).nodes[0].nodes[0],
                where: 'invalid',
                stringify: 'book|mark\n',
                deindent: false,
            });
            // selector level
            expect(selector!.afterSelector, 'after selector').to.eql(false);
            expectAstLocation(selector!, {
                stringify: 'book|mark',
                parents: [
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
                ],
            });
            // unresolved levels
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should offer potential selector for unclosed declaration`, () => {
            const { position, parsed } = setupWithCursor(`
                .nest {
                    color: gre|en
                }
            `);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);
            // base level
            expectAstLocation(base, {
                node: (parsed.ast as any).nodes[0].nodes[0],
                where: 'declValue',
                stringify: 'color: gre|en',
            });
            // decl-value level
            expectAstLocation(declValue!, {
                stringify: 'gre|en',
                parents: [
                    {
                        desc: 'decl node',
                        type: 'decl',
                        str: 'color: green',
                    },
                ],
            });
            // selector level
            expect(selector!.afterSelector, 'after selector').to.eql(false);
            expectAstLocation(selector!, {
                stringify: 'gre|en',
                parents: [
                    {
                        desc: 'decl node',
                        type: 'decl',
                        str: 'color: green',
                    },
                    {
                        desc: 'top selector node',
                        str: 'color: green',
                    },
                ],
            });
            // unresolved levels
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it(`should provide potential selector for last invalid node (after whitespace)`, () => {
            const { position, parsed } = setupWithCursor(`.before   |   \t`, {
                deindent: false,
            });

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);

            // base level
            expectAstLocation(base, {
                stringify: '.before   |   \t',
                where: 'invalid',
            });
            // selector level
            expect(selector!.afterSelector, 'after selector').to.eql(true);
            expectAstLocation(selector!, {
                stringify: '.before   |   \t',
                parents: [
                    {
                        desc: 'invalid node',
                        type: 'invalid',
                        str: '.before      \t',
                    },
                ],
            });
            // unresolved levels
            expect(declValue, 'declValue').to.eql(undefined);
            expect(atRuleParams, 'atRuleParams').to.eql(undefined);
        });
        it('should get unclosed at-rule cursor at name', () => {
            const { position, parsed } = setupWithCursor(`@bookmark|`);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);

            // base level
            expectAstLocation(base, {
                stringify: '@bookmark|',
                where: 'atRuleName',
            });
            // atrule-params level
            expectAstLocation(atRuleParams!, {
                stringify: '|',
                parents: [
                    {
                        desc: 'atrule node',
                        str: '@bookmark',
                    },
                ],
            });
            // unresolved levels
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
        });
        it('should get unclosed at-rule cursor empty params', () => {
            const { position, parsed } = setupWithCursor(`@bookmark |`);

            const { base, selector, declValue, atRuleParams } = getAstNodeAt(parsed, position);

            // base level
            expectAstLocation(base, {
                stringify: '@bookmark |',
                where: 'atRuleParams',
            });
            // atrule-params level
            expect(stringifyCSSValue(atRuleParams!.ast), 'params ast').to.eql(' ');
            expectAstLocation(atRuleParams!, {
                stringify: ' |',
                parents: [
                    {
                        desc: 'rule node',
                        str: '@bookmark ',
                    },
                ],
            });
            // unresolved levels
            expect(selector, 'selector').to.eql(undefined);
            expect(declValue, 'declValue').to.eql(undefined);
        });
    });
});
