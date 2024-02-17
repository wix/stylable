import type * as postcss from 'postcss';
import { walk, type ImmutableSelectorNode, ImmutableSelector } from '@tokey/css-selector-parser';
import * as CSSValue from '@tokey/css-value-parser';
import { parseSelectorWithCache } from '@stylable/core/dist/index-internal';
import type { Invalid } from './invalid-node';
import { AMBIGUITY, ParseForEditingResult } from './edit-time-parser';

// ToDo: move to tokey
function walkValue(
    valueList: CSSValue.BaseAstNode[],
    visit: (node: CSSValue.BaseAstNode) => number | undefined
) {
    for (const node of valueList) {
        const changeWalk = visit(node);
        if (changeWalk === walk.stopAll) {
            return;
        }
        if (node.type === 'call' && changeWalk !== walk.skipNested) {
            walkValue(node.args, visit);
        }
    }
}
//

export type NodeType = postcss.AnyNode | ImmutableSelectorNode | CSSValue.BaseAstNode;
export type AstLocation =
    | {
          type: 'base';
          node: postcss.AnyNode;
          offsetInNode: number;
          where:
              | 'root'
              | 'comment'
              | 'ruleSelector'
              | 'ruleBetweenSelectorAndBody'
              | 'ruleBody'
              | 'atRuleName'
              | 'atRuleParams'
              | 'atRuleBody'
              | 'declProp'
              | 'declBetweenPropAndColon'
              | 'declValue'
              | 'invalid';
      }
    | {
          type: 'selector';
          node: ImmutableSelectorNode;
          offsetInNode: number;
          parents: NodeType[];
          afterSelector: boolean;
      }
    | {
          type: 'declValue';
          ast: CSSValue.BaseAstNode[];
          node: CSSValue.BaseAstNode | CSSValue.BaseAstNode[];
          offsetInNode: number;
          parents: NodeType[];
      }
    | {
          type: 'atRuleParams';
          ast: CSSValue.BaseAstNode[];
          node: CSSValue.BaseAstNode | CSSValue.BaseAstNode[];
          offsetInNode: number;
          parents: NodeType[];
      };
export interface AstLocationResult {
    base: AstLocation & { type: 'base' };
    selector: (AstLocation & { type: 'selector' }) | undefined;
    declValue: (AstLocation & { type: 'declValue' }) | undefined;
    atRuleParams: (AstLocation & { type: 'atRuleParams' }) | undefined;
}
function isClosed(node: postcss.AnyNode) {
    const isLast = node.parent && node.parent.nodes![node.parent.nodes!.length - 1] === node;
    if (node.type === 'decl' || (node.type === 'atrule' && !node.nodes)) {
        return isLast ? node.parent?.raws.semicolon : true;
    }
    return true;
}
export function getAstNodeAt(parseData: ParseForEditingResult, targetOffset: number) {
    const result: AstLocationResult = {
        base: {
            type: 'base',
            node: parseData.ast,
            offsetInNode: targetOffset,
            where: 'root',
        },
        selector: undefined,
        declValue: undefined,
        atRuleParams: undefined,
    };

    parseData.ast.walk((node) => {
        const {
            isInRange: inNode,
            nodeEndsAfterCaret,
            nodeStartBeforeCaret,
        } = isPostcssNodeInRange(node, targetOffset);
        // check for space after unclosed node
        let afterNodeContent = false;
        if (!inNode && !nodeEndsAfterCaret && !isClosed(node)) {
            afterNodeContent = isPostcssNodeInRange(node.parent!, targetOffset).isInRange;
        }
        if (!inNode && !afterNodeContent) {
            // not part of node: bailout completely if node is after caret
            return nodeStartBeforeCaret ? undefined : false;
        }
        const baseNodeOffset = node.source!.start!.offset;
        result.base.node = node;
        result.base.offsetInNode = targetOffset - baseNodeOffset;
        if (node.type === 'comment') {
            result.base.where = 'comment';
            return false;
        } else if (isInvalid(node)) {
            result.base.where = 'invalid';
        }
        const checkContext: CheckContext = {
            baseNodeOffset,
            targetOffset,
            afterNodeContent,
            result,
        };
        // check nested structures
        checkRuleSelector(node, checkContext, parseData);
        checkDeclValue(node, checkContext);
        checkAtRuleParams(node, checkContext);
        return;
    });
    return result;
}

interface CheckContext {
    baseNodeOffset: number;
    targetOffset: number;
    afterNodeContent: boolean;
    result: AstLocationResult;
}

function checkRuleSelector(
    node: postcss.AnyNode,
    { baseNodeOffset, targetOffset, result }: CheckContext,
    parseData: ParseForEditingResult
) {
    const isInRule = isRule(node);
    if (
        isInRule ||
        isInvalid(node) ||
        (isDeclaration(node) &&
            parseData.ambiguousNodes
                .get(node)
                ?.find((type) => type === AMBIGUITY.POSSIBLE_UNOPENED_RULE)) ||
        (isAtRule(node) && node.name === 'st-scope')
    ) {
        let selector = '';
        let selectorAfterWhiteSpaceLength = 0;
        let selectorStartOffset = baseNodeOffset;
        if (node.type === 'rule') {
            selector = node.selector;
            selectorAfterWhiteSpaceLength = node.raws.between?.length || 0;
        } else if (isDeclaration(node)) {
            selector = node.prop + node.raws.between + node.value; // + node.important;
        } else if (isAtRule(node)) {
            selector = node.params;
            selectorStartOffset += '@st-scope'.length + 1;
        } else {
            selector = node.value;
        }
        const selectorEnd = selectorStartOffset + selector.length;
        const afterSelector = selectorEnd < targetOffset;
        const beforeBody =
            afterSelector && selectorEnd + selectorAfterWhiteSpaceLength >= targetOffset;

        if (afterSelector && !beforeBody) {
            // not in selector
            isInRule && (result.base.where = 'ruleBody');
            return;
        }
        const selectors = parseSelectorWithCache(selector);
        result.selector = {
            type: 'selector',
            /* If there are actual selectors then Initiate with last selector that is either overridden 
                by actual selector at caret, or used in case caret is in the whitespace after the selector.
               Else if there is no selector then set an empty selector to show a zero size selector.
            */
            node:
                selectors && selectors.length
                    ? selectors[selectors.length - 1]
                    : ({
                          type: 'selector',
                          after: '',
                          before: '',
                          nodes: [],
                          start: 0,
                          end: 0,
                      } as ImmutableSelector),
            offsetInNode: !afterSelector ? 0 : selector.length + targetOffset - selectorEnd,
            afterSelector,
            parents: [],
        };
        isInRule && (result.base.where = 'ruleBetweenSelectorAndBody');
        if (selectors.length && !afterSelector) {
            isInRule && (result.base.where = 'ruleSelector');
            const selectorTargetOffset = targetOffset - selectorStartOffset;
            walk(selectors, (selectorNode, _index, _nodes, parents) => {
                const isTargetAfterStart = selectorStartOffset + selectorNode.start < targetOffset;
                const isTargetBeforeEnd = selectorStartOffset + selectorNode.end >= targetOffset;
                const isSelector = selectorNode.type === 'selector';
                if (!isTargetAfterStart) {
                    // selector is after the target offset
                    if (isSelector && selectorStartOffset + selectorNode.start === targetOffset) {
                        // start of selector
                        result.selector!.node = selectorNode;
                    }
                    return walk.stopAll;
                } else if (!isTargetBeforeEnd) {
                    // selector ends before target offset
                    return walk.skipNested;
                }
                result.selector!.parents = [...parents];
                result.selector!.node = selectorNode;
                result.selector!.offsetInNode = selectorTargetOffset - selectorNode.start;
                if (!isSelector) {
                    result.selector!.afterSelector = false;
                } else if (
                    selectorStartOffset + selectorNode.start - selectorNode.after.length <
                    targetOffset
                ) {
                    result.selector!.afterSelector = true;
                }
                return;
            });
        }
        result.selector.parents = [node, ...result.selector.parents];
    }
}
function checkDeclValue(node: postcss.AnyNode, checkContext: CheckContext) {
    if (isDeclaration(node)) {
        const { between = '', value: rawsValue } = node.raws;
        const colon = between.slice(0, between.indexOf(':') + 1);
        const afterColon = between.slice(colon.length);
        const valueStart = checkContext.baseNodeOffset + node.prop.length + colon.length;
        // ToDo: "where=declImportant"
        const parentNode = node.parent;
        const unclosedDeclExtraSpace =
            parentNode?.nodes[parentNode.nodes.length - 1] === node && !parentNode.raws.semicolon
                ? node.parent?.raws.after
                : '';
        const valueAfterColon =
            afterColon + (rawsValue?.raw ? rawsValue.raw : node.value + unclosedDeclExtraSpace);
        const valueEnd = valueStart + valueAfterColon.length;
        const ast = CSSValue.parseCSSValue(valueAfterColon);
        const isInValue = checkValue({
            type: 'declValue',
            ast,
            node,
            valueStart,
            valueEnd,
            checkContext,
        });
        let where: (typeof base)['where'] = 'declValue';
        const base = checkContext.result.base;
        if (isInValue) {
            // prop:| value |
            where = 'declValue';
        } else if (base.offsetInNode > node.prop.length) {
            // prop | |: value
            where = 'declBetweenPropAndColon';
        } else {
            // |prop|: value
            where = 'declProp';
        }
        base.where = where;
    }
}
function checkAtRuleParams(node: postcss.AnyNode, checkContext: CheckContext) {
    if (isAtRule(node)) {
        const AtPrefixLength = 1;
        const { afterName = '', between = '' } = node.raws;
        const parentNode = node.parent;
        const unclosedExtraSpace =
            parentNode?.nodes[parentNode.nodes.length - 1] === node && !parentNode.raws.semicolon
                ? node.parent?.raws.after
                : '';
        const prelude = afterName + node.params + between + unclosedExtraSpace;
        const valueStart = checkContext.baseNodeOffset + AtPrefixLength + node.name.length;
        const valueEnd = valueStart + prelude.length;

        const ast = CSSValue.parseCSSValue(prelude);

        const isInParams = checkValue({
            type: 'atRuleParams',
            ast,
            node,
            valueStart,
            valueEnd,
            checkContext,
        });
        let where: (typeof base)['where'] = 'atRuleParams';
        const base = checkContext.result.base;
        if (isInParams) {
            if (checkContext.result.atRuleParams!.offsetInNode === 0) {
                // @name| params
                where = 'atRuleName';
            } else {
                // @name |params|
                where = 'atRuleParams';
            }
        } else if (
            checkContext.baseNodeOffset + node.name.length + 1 >=
            checkContext.targetOffset
        ) {
            // @|nam|e params
            where = 'atRuleName';
        } else {
            // @name params { | }
            where = 'atRuleBody';
        }
        base.where = where;
    }
}
function checkValue({
    ast,
    node,
    type,
    valueStart,
    valueEnd,
    checkContext: { targetOffset, result },
}: {
    ast: CSSValue.BaseAstNode[];
    node: postcss.AnyNode;
    type: 'atRuleParams' | 'declValue';
    valueStart: number;
    valueEnd: number;
    checkContext: CheckContext;
}) {
    /* value | */
    const isAfterValue = valueEnd < targetOffset;
    const isBeforeValue = valueStart > targetOffset;
    if (isBeforeValue || isAfterValue) {
        // not in value
        return false;
    }
    const valueLocation: Extract<AstLocation, { type: 'atRuleParams' | 'declValue' }> = {
        type,
        ast,
        node: ast,
        offsetInNode: 0,
        parents: [node],
    };
    walkValue(ast, (node) => {
        const isTargetAfterStart =
            valueStart + node.start < targetOffset ||
            (valueStart === targetOffset && node.start === 0);
        const isTargetBeforeEnd = valueStart + node.end >= targetOffset;
        if (!isTargetAfterStart) {
            // value is after the target offset
            return walk.stopAll;
        } else if (!isTargetBeforeEnd) {
            // value ends before target offset
            return walk.skipNested;
        }
        // update
        if (!Array.isArray(valueLocation.node)) {
            valueLocation.parents.push(valueLocation.node);
        }
        valueLocation.node = node;
        valueLocation.offsetInNode = targetOffset - valueStart - node.start;
        return;
    });
    result[type] = valueLocation as any; // ToDo: figure out type issue
    return true;
}
function isPostcssNodeInRange(node: postcss.AnyNode | postcss.Container, target: number) {
    const result = {
        isInRange: false,
        nodeStartBeforeCaret: false,
        nodeEndsAfterCaret: false,
    };
    if (node.source?.start && node.source?.end) {
        const beforeSize = node.type === 'rule' ? node.raws.before.length : 0;
        result.nodeStartBeforeCaret = node.source.start.offset - beforeSize <= target;
        result.nodeEndsAfterCaret = node.source.end.offset >= target;
        result.isInRange = result.nodeStartBeforeCaret && result.nodeEndsAfterCaret;
    }
    return result;
}

export function isRule(node: any): node is postcss.Rule {
    return node?.type === `rule`;
}
export function isDeclaration(node: any): node is postcss.Declaration {
    return node?.type === `decl`;
}
export function isAtRule(node: any): node is postcss.AtRule {
    return node?.type === `atrule`;
}
export function isInvalid(node: any): node is Invalid {
    return node?.type === `invalid`;
}
