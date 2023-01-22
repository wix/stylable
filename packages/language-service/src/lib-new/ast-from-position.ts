import type * as postcss from 'postcss';
import { walk, type ImmutableSelectorNode } from '@tokey/css-selector-parser';
import * as CSSValue from '@tokey/css-value-parser';
import { parseSelectorWithCache } from '@stylable/core/dist/index-internal';
import type { Invalid } from './invalid-node';
import { AMBIGUITY, ParseForEditingResult } from './edit-time-parser';

// ToDo: move to tokey
function walkValue(valueList: CSSValue.BaseAstNode[], visit: (node: CSSValue.BaseAstNode) => void) {
    for (const node of valueList) {
        visit(node);
        if (node.type === 'call') {
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
          parents: postcss.AnyNode[];
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
          node: CSSValue.BaseAstNode | CSSValue.BaseAstNode[];
          offsetInNode: number;
          parents: NodeType[];
          afterValue: boolean;
      }
    | {
          type: 'atRuleParams';
          node: CSSValue.BaseAstNode | CSSValue.BaseAstNode[];
          offsetInNode: number;
          parents: NodeType[];
          afterValue: boolean;
      };
export interface AstLocationResult {
    base: AstLocation & { type: 'base' };
    selector?: AstLocation & { type: 'selector' };
    declValue?: AstLocation & { type: 'declValue' };
    atRuleParams?: AstLocation & { type: 'atRuleParams' };
}
function isClosed(node: postcss.AnyNode) {
    const isLast = node.parent && node.parent.nodes[node.parent.nodes.length - 1] === node;
    if (node.type === 'decl') {
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
            parents: [],
        },
    };

    parseData.ast.walk((node) => {
        const { isInRange: inNode, isAfter: isAfterNode } = isPostcssNodeInRange(
            node,
            targetOffset
        );
        // check for space after unclosed node
        let afterNodeContent = false;
        if (!inNode && !isAfterNode && !isClosed(node)) {
            afterNodeContent = isPostcssNodeInRange(node.parent!, targetOffset).isInRange;
        }
        if (!inNode && !afterNodeContent) {
            // not part of node: bailout
            return;
        }
        const baseNodeOffset = node.source!.start!.offset;
        result.base.node = node;
        result.base.offsetInNode = targetOffset - baseNodeOffset;
        result.base.parents.push(node);
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
    });
    // remove closest parent node
    for (const location of Object.values(result)) {
        if (location.node === location.parents[location.parents.length - 1]) {
            location.parents.pop();
        }
    }
    //
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
    if (
        isRule(node) ||
        isInvalid(node) ||
        (isDeclaration(node) &&
            parseData.ambiguousNodes
                .get(node)
                ?.find((type) => type === AMBIGUITY.POSSIBLE_UNOPENED_RULE))
    ) {
        let selector = ''; // = node.type === 'rule' ? node.selector : node.value;
        let selectorAfterWhiteSpaceLength = 0;
        if (node.type === 'rule') {
            selector = node.selector;
            selectorAfterWhiteSpaceLength = node.raws.between?.length || 0;
        } else if (isDeclaration(node)) {
            selector = node.prop + node.raws.between + node.value; // + node.important;
        } else {
            selector = node.value;
        }
        const selectorEnd = baseNodeOffset + selector.length;
        const afterSelector = selectorEnd < targetOffset;
        const beforeBody =
            afterSelector && selectorEnd + selectorAfterWhiteSpaceLength >= targetOffset;

        if (afterSelector && !beforeBody) {
            // not in selector
            return;
        }
        const selectors = parseSelectorWithCache(selector);
        result.selector = {
            type: 'selector',
            node: selectors
                ? selectors[selectors.length - 1]
                : ([] as unknown as ImmutableSelectorNode),
            offsetInNode: !afterSelector ? 0 : selector.length + targetOffset - selectorEnd,
            afterSelector,
            parents: [...result.base.parents],
        };
        if (selectors.length && !afterSelector) {
            let selectorOffset = targetOffset - baseNodeOffset;
            walk(selectors, (selectorNode, _index, _nodes, parents) => {
                if (parents.length === 0) {
                    selectorOffset = targetOffset - baseNodeOffset - selectorNode.start;
                }
                const isTargetAfterStart = baseNodeOffset + selectorNode.start < targetOffset;
                const isTargetBeforeEnd = baseNodeOffset + selectorNode.end >= targetOffset;
                const isSelector = selectorNode.type === 'selector';
                if (!isTargetAfterStart) {
                    // selector is after the target offset
                    if (isSelector && baseNodeOffset + selectorNode.start === targetOffset) {
                        // start of selector
                        result.selector!.node = selectorNode;
                    }
                    return walk.stopAll;
                } else if (!isTargetBeforeEnd) {
                    // selector ends before target offset
                    return walk.skipNested;
                }
                result.selector!.node = selectorNode;
                if (!isSelector) {
                    selectorOffset -= selectorNode.start;
                    result.selector!.offsetInNode = selectorOffset;
                    result.selector!.afterSelector = false;
                } else if (
                    baseNodeOffset + selectorNode.start - selectorNode.after.length <
                    targetOffset
                ) {
                    result.selector!.offsetInNode = selectorOffset;
                    result.selector!.afterSelector = true;
                }
                result.selector!.parents.push(selectorNode);
                return;
            });
        }
    }
}
function checkDeclValue(node: postcss.AnyNode, checkContext: CheckContext) {
    if (isDeclaration(node)) {
        const valueStart =
            checkContext.baseNodeOffset + node.prop.length + node.raws.between!.length;
        const valueEnd = valueStart + node.value.length;
        checkValue({
            type: 'declValue',
            value: node.value,
            valueStart,
            valueEnd,
            afterSpace: 0, // ToDo: check cases
            checkContext,
        });
    }
}
function checkAtRuleParams(node: postcss.AnyNode, checkContext: CheckContext) {
    if (isAtRule(node)) {
        const valueStart =
            checkContext.baseNodeOffset + 1 + node.name.length + node.raws.afterName!.length;
        const valueEnd = valueStart + node.params.length;
        checkValue({
            type: 'atRuleParams',
            value: node.params,
            valueStart,
            valueEnd,
            afterSpace: node.raws.between!.length,
            checkContext,
        });
    }
}
function checkValue({
    value,
    type,
    valueStart,
    valueEnd,
    afterSpace,
    checkContext: { targetOffset, result, afterNodeContent },
}: {
    value: string;
    type: 'atRuleParams' | 'declValue';
    valueStart: number;
    valueEnd: number;
    afterSpace: number;
    checkContext: CheckContext;
}) {
    const isAfterValue = valueEnd < targetOffset;
    const isInIncludedSpace =
        afterNodeContent || (isAfterValue && valueEnd + afterSpace >= targetOffset);
    if (valueStart > targetOffset || (isAfterValue && !isInIncludedSpace)) {
        // not in value
        return;
    }
    const ast = CSSValue.parseCSSValue(value);
    const valueLocation: Extract<AstLocation, { type: 'atRuleParams' | 'declValue' }> = {
        type,
        node: ast,
        offsetInNode: !isInIncludedSpace ? 0 : value.length + targetOffset - valueEnd,
        parents: [...result.base.parents],
        afterValue: isInIncludedSpace,
    };
    if (!isInIncludedSpace) {
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
            valueLocation.node = node;
            valueLocation.offsetInNode = targetOffset - valueStart - node.start;
            valueLocation.parents.push(node);
            return;
        });
    }
    result[type] = valueLocation as any; // ToDo: figure out type issue
}
function isPostcssNodeInRange(node: postcss.AnyNode | postcss.Container, target: number) {
    const result = {
        isInRange: false,
        isBefore: false,
        isAfter: false,
    };
    if (node.source?.start && node.source?.end) {
        result.isBefore = node.source.start.offset <= target;
        result.isAfter = node.source.end.offset + 1 >= target;
        result.isInRange = result.isBefore && result.isAfter;
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
