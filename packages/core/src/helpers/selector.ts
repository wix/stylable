import {
    parseCssSelector,
    stringifySelectorAst,
    walk,
    SelectorNode,
    Selector,
    SelectorList,
    Containers,
    Class,
    Attribute,
    PseudoClass,
    Invalid,
} from '@tokey/css-selector-parser';
import type { DeepReadOnlyAll, DeepReadonlyObject } from './readonly';
import cloneDeep from 'lodash.clonedeep';

export const parseSelector = parseCssSelector;
export const stringifySelector = stringifySelectorAst;
export const walkSelector = walk;
export const walkSelectorReadonly = walk as DeepReadOnlyAll<typeof walk>;

export type { SelectorNode, SelectorList, Selector, PseudoClass };

/**
 * parse selectors and cache them
 */
const selectorAstCache = new Map<string, DeepReadonlyObject<SelectorList>>();
export function parseSelectorWithCache(selector: string, options: { clone: true }): SelectorList;
export function parseSelectorWithCache(
    selector: string,
    options?: { clone?: false }
): DeepReadonlyObject<SelectorList>;
export function parseSelectorWithCache(
    selector: string,
    options: { clone?: boolean } = {}
): DeepReadonlyObject<SelectorList> {
    if (!selectorAstCache.has(selector)) {
        selectorAstCache.set(selector, parseCssSelector(selector));
    }
    const cachedValue = selectorAstCache.get(selector);
    return options.clone
        ? (cloneDeep(cachedValue) as SelectorList)
        : (cachedValue as DeepReadonlyObject<SelectorList>);
}

/**
 * returns for each selector if it contains only
 * a single class or an element selector.
 */
export function isSimpleSelector(selector: string): {
    isSimple: boolean;
    type: 'class' | 'element' | 'complex';
}[] {
    const ast = parseSelectorWithCache(selector);
    return ast.map((selector) => {
        let foundType = ``;
        walkSelectorReadonly(
            selector,
            (node) => {
                if ((node.type !== `class` && node.type !== `element`) || foundType || node.nodes) {
                    foundType = `complex`;
                    return walk.stopAll;
                }
                foundType = node.type;
                return;
            },
            { ignoreList: [`selector`, `comment`] }
        );
        if (foundType === `class` || foundType === `element`) {
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
export function flattenContainerSelector(node: Containers): Selector {
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

// ToDo: make the name more specific to what this means to say
export function isNested(parents: ReadonlyArray<DeepReadonlyObject<SelectorNode>>) {
    // ToDo: Should this account for other nesting? pseudo_element or others?
    // what about ::part(partName)?
    for (const parent of parents) {
        if (parent.type === `pseudo_class`) {
            return true;
        }
    }
    return false;
}

export function isNodeMatch(
    a: Partial<DeepReadonlyObject<SelectorNode>>,
    b: Partial<DeepReadonlyObject<SelectorNode>>
) {
    return a.type === b.type && (a as any).value === (b as any).value;
}

export function isRootValid(ast: DeepReadonlyObject<SelectorList>) {
    let isValid = true;
    walkSelectorReadonly(ast, (node, index, nodes) => {
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
                if (part.type === 'element' || (part.type === 'class' && part.value !== 'root')) {
                    isLastScopeGlobal = false;
                }
            }
        }
        return undefined;
    });
    return isValid;
}

function isGlobal(node: DeepReadonlyObject<SelectorNode>) {
    return node.type === 'pseudo_class' && node.value === 'global';
}

export type Chunk = SelectorNode[];
export type ChunkedSelector = { before: string; after: string; chunks: Chunk[] };
// ToDo: check why "2" ? what does this do differently then "1"?
export function separateChunks2<
    I extends SelectorList | SelectorNode | DeepReadonlyObject<SelectorList | SelectorNode>
>(
    input: I
): I extends Readonly<SelectorList | SelectorNode>
    ? ChunkedSelector[]
    : DeepReadonlyObject<ChunkedSelector[]> {
    // ToDo: check SelectorNode input case
    const output: ChunkedSelector[] = [];
    let lastChunkedSelector: ChunkedSelector;
    let lastChunkSelector: Chunk;
    walkSelectorReadonly(input, (node, index, _nodes, parents) => {
        if (parents.length === 0) {
            // first level: create top level selector and initial chunks selector
            if (!output[index]) {
                // add top selector
                lastChunkedSelector = {
                    before: `before` in node ? node.before : ``,
                    after: `after` in node ? node.after : ``,
                    chunks: [],
                };
                output[index] = lastChunkedSelector;
                // add chunk selector
                lastChunkSelector = [];
                lastChunkedSelector.chunks.push(lastChunkSelector);
            }
        } else {
            // second level: (parents.length === 1)
            if (node.type === `combinator`) {
                // add next chunk selector
                lastChunkSelector = [];
                lastChunkedSelector.chunks.push(lastChunkSelector);
            }
            // add node to chunk
            lastChunkSelector.push(node as SelectorNode);
            // don't go deeper
            return walk.skipNested;
        }
        return;
    });
    return output;
}
export function mergeChunks<I extends ChunkedSelector[] | DeepReadonlyObject<ChunkedSelector[]>>(
    input: I
): I extends Readonly<ChunkedSelector[]> ? SelectorList : DeepReadonlyObject<SelectorList> {
    const output: SelectorList = [];
    for (const chunkedSelector of input) {
        output.push({
            type: `selector`,
            start: 0,
            end: 0,
            before: chunkedSelector.before,
            after: chunkedSelector.after,
            nodes: chunkedSelector.chunks.reduce<SelectorNode[]>((nodes, chunk) => {
                nodes.push(...(chunk as Chunk));
                return nodes;
            }, []),
        });
    }
    return output;
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
    scopeSelectorAst: DeepReadonlyObject<SelectorList>,
    nestedSelectorAst: DeepReadonlyObject<SelectorList>,
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
                      return isNodeMatch(node, outputAst.nodes[i]);
                  })
                : false;
            // const startWithCombinator = first && first.type === `combinator` && fist
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
