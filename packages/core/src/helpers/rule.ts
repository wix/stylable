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
} from '@tokey/css-selector-parser';
import * as postcss from 'postcss';
import { transformCustomSelectors } from './custom-selector';

export function isChildOfAtRule(rule: postcss.Container, atRuleName: string) {
    return !!(
        rule.parent &&
        rule.parent.type === 'atrule' &&
        (rule.parent as postcss.AtRule).name === atRuleName
    );
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

export function createWarningRule(
    extendedNode: string,
    scopedExtendedNode: string,
    extendedFile: string,
    extendingNode: string,
    scopedExtendingNode: string,
    extendingFile: string,
    useScoped = false
) {
    const message = `"class extending component '.${extendingNode} => ${scopedExtendingNode}' in stylesheet '${extendingFile}' was set on a node that does not extend '.${extendedNode} => ${scopedExtendedNode}' from stylesheet '${extendedFile}'" !important`;
    return postcss.rule({
        selector: `.${useScoped ? scopedExtendingNode : extendingNode}:not(.${
            useScoped ? scopedExtendedNode : extendedNode
        })::before`,
        nodes: [
            postcss.decl({
                prop: 'content',
                value: message,
            }),
            postcss.decl({
                prop: 'display',
                value: `block !important`,
            }),
            postcss.decl({
                prop: 'font-family',
                value: `monospace !important`,
            }),
            postcss.decl({
                prop: 'background-color',
                value: `red !important`,
            }),
            postcss.decl({
                prop: 'color',
                value: `white !important`,
            }),
        ],
    });
}

export function createSubsetAst<T extends postcss.Root | postcss.AtRule>(
    root: postcss.Root | postcss.AtRule,
    selectorPrefix: string,
    mixinTarget?: T,
    isRoot = false,
    getCustomSelector?: (name: string) => SelectorList | undefined,
    scopeSelector = ''
): T {
    // keyframes on class mixin?
    const prefixSelectorList = parseSelectorWithCache(selectorPrefix);
    const prefixType = prefixSelectorList[0].nodes[0];
    const containsPrefix = containsMatchInFirstChunk.bind(null, prefixType);
    const mixinRoot = mixinTarget ? mixinTarget : postcss.root();
    const scopeSelectorAST = parseSelectorWithCache(scopeSelector);
    root.nodes.forEach((node) => {
        if (node.type === `rule` && (node.selector === ':vars' || node.selector === ':import')) {
            // nodes that don't mix
            return;
        } else if (node.type === `rule`) {
            let selectorAst = parseSelectorWithCache(node.selector, { clone: true });
            if (scopeSelector) {
                selectorAst = scopeNestedSelector(scopeSelectorAST, selectorAst, isRoot).ast;
            }
            let ast = isRoot
                ? scopeNestedSelector(prefixSelectorList, selectorAst, true).ast
                : selectorAst;
            if (getCustomSelector) {
                ast = transformCustomSelectors(ast, getCustomSelector, () => {
                    /*don't report*/
                });
            }
            const matchesSelectors = isRoot ? ast : ast.filter((node) => containsPrefix(node));

            if (matchesSelectors.length) {
                const selector = stringifySelector(
                    matchesSelectors.map((selectorNode) => {
                        if (!isRoot) {
                            selectorNode = fixChunkOrdering(selectorNode, prefixType);
                        }
                        replaceTargetWithNesting(selectorNode, prefixType);
                        return selectorNode;
                    })
                );

                mixinRoot.append(node.clone({ selector }));
            }
        } else if (node.type === `atrule`) {
            if (
                node.name === 'media' ||
                node.name === 'supports' ||
                node.name === 'st-scope' ||
                node.name === 'layer'
            ) {
                const scopeSelector = node.name === 'st-scope' ? node.params : '';
                const atRuleSubset = createSubsetAst(
                    node,
                    selectorPrefix,
                    postcss.atRule({
                        params: node.params,
                        name: node.name,
                    }),
                    isRoot,
                    getCustomSelector,
                    scopeSelector
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

function replaceTargetWithNesting(selectorNode: Selector, prefixType: ImmutableSelectorNode) {
    walkSelector(selectorNode, (node) => {
        if (matchTypeAndValue(node, prefixType)) {
            convertToSelector(node).nodes = [
                {
                    type: `nesting`,
                    value: `&`,
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
