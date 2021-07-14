import {
    parseSelectorWithCache,
    stringifySelector,
    scopeNestedSelector,
    SelectorNode,
    walkSelector,
    walkSelectorReadonly,
    convertToSelector,
    isNodeMatch,
    isSimpleSelector,
    Selector,
} from './selector';
import type { DeepReadonlyObject } from './readonly';
import { valueMapping } from '../stylable-value-parsers';
import * as postcss from 'postcss';
import { ignoreDeprecationWarn } from './deprecation';
import type { SRule } from '../deprecated/postcss-ast-extension';

export function isChildOfAtRule(rule: postcss.Container, atRuleName: string) {
    return (
        rule.parent &&
        rule.parent.type === 'atrule' &&
        (rule.parent as postcss.AtRule).name === atRuleName
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
    isRoot = false
): T {
    // keyframes on class mixin?
    const prefixSelectorList = parseSelectorWithCache(selectorPrefix);
    const prefixType = prefixSelectorList[0].nodes[0];
    const containsPrefix = containsMatchInFirstChunk.bind(null, prefixType);
    const mixinRoot = mixinTarget ? mixinTarget : postcss.root();

    root.nodes.forEach((node) => {
        if (node.type === `rule`) {
            const selectorAst = parseSelectorWithCache(node.selector, { clone: true });
            const ast = isRoot
                ? scopeNestedSelector(prefixSelectorList, selectorAst, true).ast
                : selectorAst;

            const matchesSelectors = isRoot ? ast : ast.filter((node) => containsPrefix(node));

            if (matchesSelectors.length) {
                const selector = stringifySelector(
                    matchesSelectors.map((selectorNode) => {
                        if (!isRoot) {
                            fixChunkOrdering(selectorNode, prefixType);
                        }
                        replaceTargetWithNesting(selectorNode, prefixType);
                        return selectorNode;
                    })
                );

                mixinRoot.append(node.clone({ selector }));
            }
        } else if (node.type === `atrule`) {
            if (node.name === 'media' || node.name === 'supports') {
                const atRuleSubset = createSubsetAst(
                    node,
                    selectorPrefix,
                    postcss.atRule({
                        params: node.params,
                        name: node.name,
                    }),
                    isRoot
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

function replaceTargetWithNesting(
    selectorNode: Selector,
    prefixType: DeepReadonlyObject<SelectorNode>
) {
    walkSelector(selectorNode, (node) => {
        if (isNodeMatch(node, prefixType)) {
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

function fixChunkOrdering(selectorNode: Selector, prefixType: DeepReadonlyObject<SelectorNode>) {
    let startChunkIndex = 0;
    let moved = false;
    walkSelector(selectorNode, (node, index, nodes) => {
        if (node.type === `combinator`) {
            startChunkIndex = index + 1;
            moved = false;
        } else if (isNodeMatch(node, prefixType)) {
            if (index > 0 && !moved) {
                moved = true;
                nodes.splice(index, 1);
                nodes.splice(startChunkIndex, 0, node);
            }
        }
        return undefined;
    });
}

function containsMatchInFirstChunk(
    prefixType: DeepReadonlyObject<SelectorNode>,
    selectorNode: DeepReadonlyObject<SelectorNode>
) {
    let isMatch = false;
    walkSelectorReadonly(selectorNode, (node) => {
        if (node.type === `combinator`) {
            return walkSelector.stopAll;
        } else if (node.type === 'pseudo_class') {
            return walkSelector.skipNested;
        } else if (isNodeMatch(node, prefixType)) {
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
    test: any = (statement: any) => statement.prop === valueMapping.extends
): null | postcss.Declaration {
    let found: any = null;
    root.walkRules(selector, (rule) => {
        const declarationIndex = rule.nodes ? rule.nodes.findIndex(test) : -1;
        const isSimplePerSelector = isSimpleSelector(rule.selector);
        // This will assume that a selector that contains .a, .b:hover is simple! (for backward comptibility)
        const isSimple = isSimplePerSelector.reduce((acc, { isSimple }) => {
            return !isSimple ? false : acc;
        }, true);
        if (isSimple && !!~declarationIndex) {
            found = rule.nodes[declarationIndex];
        }
    });
    return found;
}

export function getRuleScopeSelector(rule: postcss.Rule) {
    return ignoreDeprecationWarn(() => (rule as SRule).stScopeSelector);
}
