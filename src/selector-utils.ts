const tokenizer = require('css-selector-tokenizer');

export interface SelectorAstNode {
    type: string;
    name: string;
    nodes: SelectorAstNode[];
    content?: string;
    before?: string;
    value?: string;
    operator?: string;
}

export interface PseudoSelectorAstNode extends SelectorAstNode {
    type: 'pseudo-class';
    content: string;
}

export type Visitor = (node: SelectorAstNode, index: number, nodes: SelectorAstNode[]) => boolean | void;

export function parseSelector(selector: string): SelectorAstNode {
    return tokenizer.parse(selector);
}

export function stringifySelector(ast: SelectorAstNode): string {
    return tokenizer.stringify(ast);
}

export function traverseNode(node: SelectorAstNode,
                             visitor: Visitor,
                             index: number = 0,
                             nodes: SelectorAstNode[] = [node]): boolean | void {

    if (!node) {
        return;
    }
    const cNodes = node.nodes;
    let doNext = visitor(node, index, nodes);
    if (doNext === false) {
        return false;
    }
    if (doNext === true) {
        return true;
    }
    if (cNodes) {
        for (let i = 0; i < node.nodes.length; i++) {
            doNext = traverseNode(node.nodes[i], visitor, i, node.nodes);
            if (doNext === true) {
                continue;
            }
            if (doNext === false) {
                return false;
            }
        }
    }
}

export function createChecker(types: Array<string | string[]>) {
    return () => {
        let index = 0;
        return (node: SelectorAstNode) => {
            const matcher = types[index];
            if (Array.isArray(matcher)) {
                return matcher.indexOf(node.type) !== -1;
            } else if (matcher !== node.type) {
                return false;
            }
            if (types[index] !== node.type) {
                return false;
            }
            index++;
            return true;
        };
    };
}

export function createRootAfterSpaceChecker() {
    let hasSpacing = false;
    let isValid = true;
    return (node?: SelectorAstNode) => {
        if (!node) {
            return isValid;
        }
        if (node.type === 'selector') {
            hasSpacing = false;
        } else if (node.type === 'spacing') {
            hasSpacing = true;
        } else if (node.type === 'class' && node.name === 'root' && hasSpacing) {
            isValid = false;
        }
        return isValid;
    };
}

export const createSimpleSelectorChecker = createChecker(['selectors', 'selector', ['element', 'class']]);

export function isImport(ast: SelectorAstNode): boolean {
    const selectors = ast.nodes[0];
    const selector = selectors && selectors.nodes[0];
    return selector && selector.type === 'pseudo-class' && selector.name === 'import';
}

export function matchAtKeyframes(selector: string) {
    return selector.match(/^@keyframes\s*(.*)/);
}

export function matchAtMedia(selector: string) {
    return selector.match(/^@media\s*(.*)/);
}

export function isNodeMatch(nodeA: SelectorAstNode, nodeB: SelectorAstNode) {
    return nodeA.type === nodeB.type && nodeA.name === nodeB.name;
}

export interface SelectorChunk {
    type: string;
    operator?: string;
    nodes: Array<Partial<SelectorAstNode>>;
}

export function separateChunks(selectorNode: SelectorAstNode) {
    const selectors: SelectorChunk[][] = [];

    traverseNode(selectorNode, node => {
        if (node.type === 'selectors') {
            // skip
        } else if (node.type === 'selector') {
            selectors.push([
                {type: 'selector', nodes: []}
            ]);
        } else if (node.type === 'operator') {
            const chunks = selectors[selectors.length - 1];
            chunks.push({type: node.type, operator: node.operator, nodes: []});
        } else if (node.type === 'spacing') {
            const chunks = selectors[selectors.length - 1];
            chunks.push({type: node.type, nodes: []});
        } else {
            const chunks = selectors[selectors.length - 1];
            chunks[chunks.length - 1].nodes.push(node);
        }
    });
    return selectors;
}

function getLastChunk(selectorChunk: SelectorChunk[]): SelectorChunk {
    return selectorChunk[selectorChunk.length - 1];
}

export function filterByType(chunk: SelectorChunk, typeOptions: string[]): Array<Partial<SelectorAstNode>> {
    return chunk.nodes.filter(node => {
        return node.type && typeOptions.indexOf(node.type) !== -1;
    });
}

export function isSameTargetElement(requestSelector: string, targetSelector: string): boolean {
    // what about nested-pseudo-classes?
    // handle multiple selector on target
    // isSameTargetElement(selector1,selector2):

    // a = separateChunks(requestingSelector)
    // b = separateChunks(currentSelector)

    // b.forEach((ib)=>{

    // la = getLastChunk(a)
    // lb = getLastChunk(ib)

    // rla = filterByType(la, [class element pseudo-element])
    // rlb = filterByType(lb, [class element pseudo-element])

    // rlb.isContains(rla);
    // })

    const a = separateChunks(parseSelector(requestSelector));
    const b = separateChunks(parseSelector(targetSelector));

    const lastChunkA = getLastChunk(a[0]);
    const relevantChunksA = filterByType(lastChunkA, ['class', 'element', 'pseudo-element']);

    let found: boolean = false;
    b.forEach(compoundSelector => {
        let match: boolean = true;
        const lastChunkB = getLastChunk(compoundSelector);
        const relevantChunksB = filterByType(lastChunkB, ['class', 'element', 'pseudo-element']);

        relevantChunksA.forEach(chunkA => {
            if (relevantChunksB.find(chunkB => chunkB.name === chunkA.name) === undefined) {
                // not found
                match = false;
            }
        });
        if (match) {
            found = true;
        }
    });

    return found;
}

export function fixChunkOrdering(selectorNode: SelectorAstNode, prefixType: SelectorAstNode) {
    let startChunkIndex = 0;
    let moved = false;
    traverseNode(selectorNode, (node, index, nodes) => {
        if (node.type === 'operator' || node.type === 'spacing') {
            startChunkIndex = index + 1;
            moved = false;
        } else if (isNodeMatch(node, prefixType)) {
            if (index > 0 && !moved) {
                moved = true;
                nodes.splice(index, 1);
                nodes.splice(startChunkIndex, 0, node);
            }
            // return false;
        }
        return undefined;
    });
}
