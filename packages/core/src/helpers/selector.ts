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

export const parseSelector = parseCssSelector;
export const stringifySelector = stringifySelectorAst;
export const walkSelector = walk;

export type { SelectorNode, SelectorList, Selector, PseudoClass };

/**
 * take an ast node with nested nodes "XXX(nest1,  nest2)"
 * and convert it to a flat selector as node: "nest1, nest2" 
 */
export function flattenContainerSelector(node: Containers): Selector {
    node.value = ``;
    const castedNode = node as SelectorNode as Selector;
    castedNode.type = `selector`;
    castedNode.before ||= ``;
    castedNode.after ||= ``;
    // ToDo: should this fix castedNode.end?
    return castedNode;
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

// ToDo: make the name more specific to what this means to say
export function isNested(parents: SelectorNode[]) {
    // ToDo: Should this account for other nesting? pseudo_element or others?
    // what about ::part(partName)?
    for (const parent of parents) {
        if (parent.type === `pseudo_class`) {
            return true;
        }
    }
    return false;
}

export function isRootValid(ast: SelectorList) {
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
                if (part.type === 'element' || (part.type === 'class' && part.value !== 'root')) {
                    isLastScopeGlobal = false;
                }
            }
        }
        return undefined;
    });
    return isValid;
}

function isGlobal(node: SelectorNode) {
    return node.type === 'pseudo_class' && node.value === 'global';
}

export type Chunk = SelectorNode[];
export type ChunkedSelector = {before: string, after: string, chunks: Chunk[]};
// ToDo: check why "2" ? what does this do differently then "1"?
export function separateChunks2(input: SelectorList|SelectorNode) {
    // ToDo: check SelectorNode input case
    const output: ChunkedSelector[] = [];
    let lastChunkedSelector: ChunkedSelector;
    let lastChunkSelector: Chunk;
    walk(input, (node, index, _nodes, parents) => {
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
            lastChunkSelector.push(node);
            // don't go deeper
            return walk.skipNested;
        }
        return;
    });
    return output;
}
export function mergeChunks(input: ChunkedSelector[]): SelectorList {
    const output: SelectorList = [];
    for (const chunkedSelector of input) {
        output.push({
            type: `selector`,
            start: 0,
            end: 0,
            before: chunkedSelector.before,
            after: chunkedSelector.after,
            nodes: chunkedSelector.chunks.reduce((nodes, chunk) => {
                nodes.push(...chunk);
                return nodes;
            }, [])
        });
    }
    return output;
}

export function isCompRoot(name: string) {
    return name.charAt(0).match(/[A-Z]/);
}
