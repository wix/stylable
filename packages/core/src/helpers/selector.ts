import {
    parseCssSelector,
    stringifySelectorAst,
    walk,
    SelectorNode,
    Selector,
    SelectorList,
    FunctionalSelector,
    Class,
    Attribute,
    Invalid,
    ImmutableSelectorList,
    ImmutableSelectorNode,
} from '@tokey/css-selector-parser';
import cloneDeep from 'lodash.clonedeep';

export const parseSelector = parseCssSelector;
export const stringifySelector = stringifySelectorAst;
export const walkSelector = walk;

/**
 * parse selectors and cache them
 */
const selectorAstCache = new Map<string, ImmutableSelectorList>();
export function parseSelectorWithCache(selector: string, options: { clone: true }): SelectorList;
export function parseSelectorWithCache(
    selector: string,
    options?: { clone?: false }
): ImmutableSelectorList;
export function parseSelectorWithCache(
    selector: string,
    options: { clone?: boolean } = {}
): ImmutableSelectorList {
    if (!selectorAstCache.has(selector)) {
        selectorAstCache.set(selector, parseCssSelector(selector));
    }
    const cachedValue = selectorAstCache.get(selector);
    return options.clone
        ? (cloneDeep(cachedValue) as SelectorList)
        : (cachedValue as ImmutableSelectorList);
}

/**
 * returns for each selector if it contains only
 * a single class or an element selector.
 */
export function isSimpleSelector(selector: string): {
    isSimple: boolean;
    type: 'class' | 'type' | 'complex';
}[] {
    const selectorList = parseSelectorWithCache(selector);
    return selectorList.map((selector) => {
        let foundType = ``;
        walk(
            selector,
            (node) => {
                if ((node.type !== `class` && node.type !== `type`) || foundType || node.nodes) {
                    foundType = `complex`;
                    return walk.stopAll;
                }
                foundType = node.type;
                return;
            },
            { ignoreList: [`selector`, `comment`] }
        );
        if (foundType === `class` || foundType === `type`) {
            return { type: foundType, isSimple: true };
        } else {
            return { type: `complex`, isSimple: false };
        }
    });
}

/**
 * take an ast node with nested nodes "XXX(nest1,  nest2)"
 * and convert it to a flat selector as node: "nest1, nest2"
 */
export function flattenFunctionalSelector(node: FunctionalSelector): Selector {
    node.value = ``;
    return convertToSelector(node);
}

/**
 * ast convertors
 */
export function convertToClass(node: SelectorNode): Class {
    const castedNode = node as Class;
    castedNode.type = `class`;
    castedNode.dotComments = [];
    return castedNode;
}
export function convertToAttribute(node: SelectorNode): Attribute {
    const castedNode = node as Attribute;
    castedNode.type = `attribute`;
    return castedNode;
}
export function convertToInvalid(node: SelectorNode): Invalid {
    const castedNode = node as Invalid;
    castedNode.type = `invalid`;
    return castedNode;
}
export function convertToSelector(node: SelectorNode): Selector {
    const castedNode = node as Selector;
    castedNode.type = `selector`;
    castedNode.before ||= ``;
    castedNode.after ||= ``;
    // ToDo: should this fix castedNode.end?
    return castedNode;
}

export function isInPseudoClassContext(parents: ReadonlyArray<ImmutableSelectorNode>) {
    for (const parent of parents) {
        if (parent.type === `pseudo_class`) {
            return true;
        }
    }
    return false;
}

export function matchTypeAndValue(
    a: Partial<ImmutableSelectorNode>,
    b: Partial<ImmutableSelectorNode>
) {
    return a.type === b.type && (a as any).value === (b as any).value;
}

export function isRootValid(ast: ImmutableSelectorList) {
    let isValid = true;
    walk(ast, (node, index, nodes) => {
        if (node.type === 'pseudo_class') {
            return walk.skipNested;
        }
        if (node.type === 'class' && node.value === `root`) {
            let isLastScopeGlobal = false;
            for (let i = 0; i < index; i++) {
                const part = nodes[i];
                if (isGlobal(part)) {
                    isLastScopeGlobal = true;
                }
                if (part.type === 'combinator' && !isLastScopeGlobal) {
                    isValid = false;
                    return walk.skipCurrentSelector;
                }
                if (part.type === 'type' || (part.type === 'class' && part.value !== 'root')) {
                    isLastScopeGlobal = false;
                }
            }
        }
        return undefined;
    });
    return isValid;
}

function isGlobal(node: ImmutableSelectorNode) {
    return node.type === 'pseudo_class' && node.value === 'global';
}

export function isCompRoot(name: string) {
    return name.charAt(0).match(/[A-Z]/);
}

/**
 * combine 2 selector lists.
 * - add each scoping selector at the begging of each nested selector
 * - replace any nesting `&` nodes in the nested selector with the scoping selector nodes
 */
export function scopeNestedSelector(
    scopeSelectorAst: ImmutableSelectorList,
    nestedSelectorAst: ImmutableSelectorList,
    rootScopeLevel = false
): { selector: string; ast: SelectorList } {
    const resultSelectors: SelectorList = [];
    nestedSelectorAst.forEach((targetAst) => {
        scopeSelectorAst.forEach((scopeAst) => {
            const outputAst = cloneDeep(targetAst) as Selector;

            outputAst.before = scopeAst.before || outputAst.before;

            let first = outputAst.nodes[0];
            // search first actual first selector part
            walkSelector(
                outputAst,
                (node) => {
                    first = node;
                    return walkSelector.stopAll;
                },
                { ignoreList: [`selector`] }
            );
            const parentRef = first.type === `nesting`;
            const globalSelector = first.type === `pseudo_class` && first.value === `global`;
            const startWithScoping = rootScopeLevel
                ? scopeAst.nodes.every((node, i) => {
                      return matchTypeAndValue(node, outputAst.nodes[i]);
                  })
                : false;
            if (first && !parentRef && !startWithScoping && !globalSelector) {
                outputAst.nodes.unshift(...cloneDeep(scopeAst.nodes as SelectorNode[]), {
                    type: `combinator`,
                    combinator: `space`,
                    value: ` `,
                    before: ``,
                    after: ``,
                    start: first.start,
                    end: first.start,
                    invalid: false,
                });
            }
            walkSelector(outputAst, (node, i, nodes) => {
                if (node.type === 'nesting') {
                    nodes.splice(i, 1, {
                        type: `selector`,
                        nodes: cloneDeep(scopeAst.nodes as SelectorNode[]),
                        start: node.start,
                        end: node.end,
                        after: ``,
                        before: ``,
                    });
                }
            });

            resultSelectors.push(outputAst);
        });
    });

    return {
        selector: stringifySelector(resultSelectors),
        ast: resultSelectors,
    };
}
