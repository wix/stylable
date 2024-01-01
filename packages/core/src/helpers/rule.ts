import {
    parseSelectorWithCache,
    stringifySelector,
    scopeNestedSelector,
    walkSelector,
    convertToSelector,
    matchTypeAndValue,
    isSimpleSelector,
} from './selector';
import {
    Selector,
    ImmutableSelectorNode,
    groupCompoundSelectors,
    SelectorList,
    SelectorNode,
} from '@tokey/css-selector-parser';
import * as postcss from 'postcss';
import { transformInlineCustomSelectors } from './custom-selector';

export function isChildOfAtRule(rule: postcss.Container, atRuleName: string) {
    let currentParent = rule.parent;
    while (currentParent) {
        if (
            currentParent.type === 'atrule' &&
            (currentParent as postcss.AtRule).name === atRuleName
        ) {
            return true;
        }
        currentParent = currentParent.parent;
    }
    return false;
}

export function isInConditionalGroup(node: postcss.Rule | postcss.AtRule, includeRoot = true) {
    // https://www.w3.org/TR/css-conditional-3/#contents-of
    const parent = node.parent as any;
    return (
        parent &&
        ((includeRoot && parent.type === `root`) ||
            (parent.type === `atrule` && (parent.name === `media` || parent.name === `supports`)))
    );
}

export function createSubsetAst<T extends postcss.Root | postcss.AtRule | postcss.Rule>(
    root: postcss.Root | postcss.AtRule | postcss.Rule,
    selectorPrefix: string,
    mixinTarget?: T,
    isRoot = false,
    getCustomSelector?: (name: string) => SelectorList | undefined,
    isNestedInMixin = false
): T {
    // keyframes on class mixin?
    const prefixSelectorList = parseSelectorWithCache(selectorPrefix);
    const prefixType = prefixSelectorList[0].nodes[0];
    const containsPrefix = containsMatchInFirstChunk.bind(null, prefixType);
    const mixinRoot = mixinTarget ? mixinTarget : postcss.root();
    root.nodes.forEach((node) => {
        if (node.type === 'decl') {
            mixinTarget?.append(node.clone());
        } else if (
            node.type === `rule` &&
            (node.selector === ':vars' || node.selector === ':import')
        ) {
            // nodes that don't mix
            return;
        } else if (node.type === `rule`) {
            const selectorAst = parseSelectorWithCache(node.selector, { clone: true });
            let ast = isRoot
                ? scopeNestedSelector(prefixSelectorList, selectorAst, true).ast
                : selectorAst;
            if (getCustomSelector) {
                ast = transformInlineCustomSelectors(ast, getCustomSelector, () => {
                    /*don't report*/
                });
            }
            const matchesSelectors =
                isRoot || isNestedInMixin ? ast : ast.filter((node) => containsPrefix(node));

            if (matchesSelectors.length) {
                const selector = stringifySelector(
                    matchesSelectors.map((selectorNode) => {
                        if (!isRoot) {
                            selectorNode = fixChunkOrdering(selectorNode, prefixType);
                        }
                        replaceTargetWithMixinAnchor(selectorNode, prefixType);
                        return selectorNode;
                    })
                );

                const clonedRule = createSubsetAst(
                    node,
                    selectorPrefix,
                    node.clone({ selector, nodes: [] }),
                    isRoot,
                    getCustomSelector,
                    true /*isNestedInMixin*/
                );
                mixinRoot.append(clonedRule);
            }
        } else if (node.type === `atrule`) {
            if (
                node.name === 'media' ||
                node.name === 'supports' ||
                node.name === 'st-scope' ||
                node.name === 'layer' ||
                node.name === 'container'
            ) {
                let scopeSelector = node.name === 'st-scope' ? node.params : '';
                let atruleHasMixin = isNestedInMixin || false;
                if (scopeSelector) {
                    const ast = parseSelectorWithCache(scopeSelector, { clone: true });
                    const matchesSelectors = isRoot
                        ? ast
                        : ast.filter((node) => containsPrefix(node));
                    if (matchesSelectors.length) {
                        atruleHasMixin = true;
                        scopeSelector = stringifySelector(
                            matchesSelectors.map((selectorNode) => {
                                if (!isRoot) {
                                    selectorNode = fixChunkOrdering(selectorNode, prefixType);
                                }
                                replaceTargetWithMixinAnchor(selectorNode, prefixType);
                                return selectorNode;
                            })
                        );
                    }
                }
                const atRuleSubset = createSubsetAst(
                    node,
                    selectorPrefix,
                    postcss.atRule({
                        params: scopeSelector || node.params,
                        name: node.name,
                    }),
                    isRoot,
                    getCustomSelector,
                    atruleHasMixin
                );
                if (atRuleSubset.nodes) {
                    mixinRoot.append(atRuleSubset);
                }
            } else if (isRoot) {
                mixinRoot.append(node.clone());
            }
        } else {
            // TODO: add warn?
        }
    });

    return mixinRoot as T;
}

export const stMixinMarker = 'st-mixin-marker';
export const isStMixinMarker = (node: SelectorNode) =>
    node.type === 'attribute' && node.value === stMixinMarker;
function replaceTargetWithMixinAnchor(selectorNode: Selector, prefixType: ImmutableSelectorNode) {
    walkSelector(selectorNode, (node) => {
        if (matchTypeAndValue(node, prefixType)) {
            convertToSelector(node).nodes = [
                {
                    type: `attribute`,
                    value: stMixinMarker,
                    start: node.start,
                    end: node.end,
                },
            ];
        }
    });
}

function fixChunkOrdering(selectorNode: Selector, prefixType: ImmutableSelectorNode) {
    const compound = groupCompoundSelectors(selectorNode, {
        deep: true,
        splitPseudoElements: false,
    });
    walkSelector(compound, (node) => {
        if (node.type === `compound_selector`) {
            const simpleNodes = node.nodes;
            for (let i = 1; i < simpleNodes.length; i++) {
                const childNode = simpleNodes[i];
                if (matchTypeAndValue(childNode, prefixType)) {
                    const chunk = simpleNodes.splice(i, simpleNodes.length - i);
                    simpleNodes.unshift(...chunk);
                    break;
                }
            }
        }
    });
    return compound;
}

function containsMatchInFirstChunk(
    prefixType: ImmutableSelectorNode,
    selectorNode: ImmutableSelectorNode
) {
    let isMatch = false;
    walkSelector(selectorNode, (node) => {
        if (node.type === `combinator`) {
            return walkSelector.stopAll;
        } else if (node.type === 'pseudo_class') {
            // handle nested match :is(.mix)
            if (node.nodes) {
                for (const innerSelectorNode of node.nodes) {
                    if (containsMatchInFirstChunk(prefixType, innerSelectorNode)) {
                        isMatch = true;
                    }
                }
            }
            return walkSelector.skipNested;
        } else if (matchTypeAndValue(node, prefixType)) {
            isMatch = true;
            return walkSelector.stopAll;
        }
        return;
    });
    return isMatch;
}

/** @deprecated internal for transformer  */
export function findRule(
    root: postcss.Root,
    selector: string,
    test: any = (statement: any) => statement.prop === `-st-extends`
): null | postcss.Declaration {
    let found: any = null;
    root.walkRules(selector, (rule) => {
        const declarationIndex = rule.nodes ? rule.nodes.findIndex(test) : -1;
        const isSimplePerSelector = isSimpleSelector(rule.selector);
        // This will assume that a selector that contains .a, .b:hover is simple! (for backward compatibility)
        const isSimple = isSimplePerSelector.reduce((acc, { isSimple }) => {
            return !isSimple ? false : acc;
        }, true);
        if (isSimple && !!~declarationIndex) {
            found = rule.nodes[declarationIndex];
        }
    });
    return found;
}
