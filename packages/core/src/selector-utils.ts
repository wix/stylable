import cssSelectorTokenizer from 'css-selector-tokenizer';

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

export type Visitor = (
    node: SelectorAstNode,
    index: number,
    nodes: SelectorAstNode[],
    parents: SelectorAstNode[]
) => boolean | void;


export function parseSelector(selector: string): SelectorAstNode {
    return cssSelectorTokenizer.parse(selector) as SelectorAstNode;
}

export function stringifySelector(ast: SelectorAstNode): string {
    return cssSelectorTokenizer.stringify(ast as cssSelectorTokenizer.SelectorsNode);
}

export function traverseNode(
    node: SelectorAstNode,
    visitor: Visitor,
    index = 0,
    nodes: SelectorAstNode[] = [node],
    parents: SelectorAstNode[] = []
): boolean | void {
    if (!node) {
        return;
    }
    const cNodes = node.nodes;
    let doNext = visitor(node, index, nodes, parents);
    if (doNext === false) {
        return false;
    }
    if (doNext === true) {
        return true;
    }
    if (cNodes) {
        parents = [...parents, node];
        for (let i = 0; i < node.nodes.length; i++) {
            doNext = traverseNode(node.nodes[i], visitor, i, node.nodes, parents);
            if (doNext === false) {
                return false;
            }
        }
    }
}

// ToDo: mark for deprecation
export function isNested(parentChain: SelectorAstNode[]) {
    let i = parentChain.length;
    while (i--) {
        if (parentChain[i].type === 'nested-pseudo-class') {
            return true;
        }
    }
    return false;
}

// ToDo: mark for deprecation
export function createChecker(types: Array<string | string[]>) {
    return () => {
        let index = 0;
        return (node: SelectorAstNode) => {
            const matcher = types[index];
            if (Array.isArray(matcher)) {
                return matcher.includes(node.type);
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

// ToDo: mark for deprecation
export function isGlobal(node: SelectorAstNode) {
    return node.type === 'nested-pseudo-class' && node.name === 'global';
}

// ToDo: mark for deprecation
export function isRootValid(ast: SelectorAstNode, rootName: string) {
    let isValid = true;

    traverseNode(ast, (node, index, nodes) => {
        if (node.type === 'nested-pseudo-class') {
            return true;
        }
        if (node.type === 'class' && node.name === rootName) {
            let isLastScopeGlobal = false;
            for (let i = 0; i < index; i++) {
                const part = nodes[i];
                if (isGlobal(part)) {
                    isLastScopeGlobal = true;
                }
                if (part.type === 'spacing' && !isLastScopeGlobal) {
                    isValid = false;
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

const createSimpleSelectorChecker = createChecker(['selectors', 'selector', ['element', 'class']]);

// ToDo: mark for deprecation
export function isSimpleSelector(selectorAst: SelectorAstNode) {
    const isSimpleSelectorASTNode = createSimpleSelectorChecker();
    const isSimple = traverseNode(
        selectorAst,
        (node) => isSimpleSelectorASTNode(node) !== false /*stop on complex selector */
    );

    return isSimple;
}

// ToDo: mark for deprecation
export function isImport(ast: SelectorAstNode): boolean {
    const selectors = ast.nodes[0];
    const selector = selectors && selectors.nodes[0];
    return selector && selector.type === 'pseudo-class' && selector.name === 'import';
}

// ToDo: mark for deprecation
export function matchAtKeyframes(selector: string) {
    return selector.match(/^@keyframes\s*(.*)/);
}

// ToDo: mark for deprecation
export function matchAtMedia(selector: string) {
    return selector.match(/^@media\s*(.*)/);
}

export function isNodeMatch(nodeA: Partial<SelectorAstNode>, nodeB: Partial<SelectorAstNode>) {
    return nodeA.type === nodeB.type && nodeA.name === nodeB.name;
}

export interface SelectorChunk {
    type: string;
    operator?: string;
    value?: string;
    nodes: Array<Partial<SelectorAstNode>>;
}

export interface SelectorChunk2 {
    type: string;
    operator?: string;
    value?: string;
    nodes: SelectorAstNode[];
    before?: string;
}

// ToDo: mark for deprecation
export function mergeChunks(chunks: SelectorChunk2[][]) {
    const ast: any = { type: 'selectors', nodes: [] };
    let i = 0;

    for (const selectorChunks of chunks) {
        ast.nodes[i] = { type: 'selector', nodes: [] };
        for (const chunk of selectorChunks) {
            if (chunk.type !== 'selector') {
                ast.nodes[i].nodes.push(chunk);
            } else {
                ast.nodes[i].before = chunk.before;
            }
            for (const node of chunk.nodes) {
                ast.nodes[i].nodes.push(node);
            }
        }
        i++;
    }
    return ast;
}

// ToDo: mark for deprecation
export function separateChunks2(selectorNode: SelectorAstNode) {
    const selectors: SelectorChunk2[][] = [];
    selectorNode.nodes.map(({ nodes, before }) => {
        selectors.push([{ type: 'selector', nodes: [], before }]);
        nodes.forEach((node) => {
            if (node.type === 'operator') {
                const chunks = selectors[selectors.length - 1];
                chunks.push({ ...node, nodes: [] });
            } else if (node.type === 'spacing') {
                const chunks = selectors[selectors.length - 1];
                chunks.push({ ...node, nodes: [] });
            } else {
                const chunks = selectors[selectors.length - 1];
                chunks[chunks.length - 1].nodes.push(node);
            }
        });
    });
    return selectors;
}

export function separateChunks(selectorNode: SelectorAstNode) {
    const selectors: SelectorChunk[][] = [];

    traverseNode(selectorNode, (node) => {
        if (node.type === 'selectors') {
            // skip
        } else if (node.type === 'selector') {
            selectors.push([{ type: 'selector', nodes: [] }]);
        } else if (node.type === 'operator') {
            const chunks = selectors[selectors.length - 1];
            chunks.push({ type: node.type, operator: node.operator, nodes: [] });
        } else if (node.type === 'spacing') {
            const chunks = selectors[selectors.length - 1];
            chunks.push({ type: node.type, value: node.value, nodes: [] });
        } else {
            const chunks = selectors[selectors.length - 1];
            chunks[chunks.length - 1].nodes.push(node);
        }
    });
    return selectors;
}

export function filterChunkNodesByType(
    chunk: SelectorChunk,
    typeOptions: string[]
): Array<Partial<SelectorAstNode>> {
    return chunk.nodes.filter((node) => {
        return node.type && typeOptions.includes(node.type);
    });
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
