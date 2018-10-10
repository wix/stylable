import * as postcss from 'postcss';
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
type nodeWithPseudo = Partial<SelectorAstNode> & { pseudo: Array<Partial<SelectorAstNode>> };

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

export function isGlobal(node: SelectorAstNode) {
    return node.type === 'nested-pseudo-class' && node.name === 'global';
}

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

export function isNodeMatch(nodeA: Partial<SelectorAstNode>, nodeB: Partial<SelectorAstNode>) {
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

export function filterChunkNodesByType(chunk: SelectorChunk, typeOptions: string[]): Array<Partial<SelectorAstNode>> {
    return chunk.nodes.filter(node => {
        return node.type && typeOptions.indexOf(node.type) !== -1;
    });
}

function isPseudoDiff(a: nodeWithPseudo, b: nodeWithPseudo) {
    const aNodes = a.pseudo;
    const bNodes = b.pseudo;

    if (!aNodes || !bNodes || aNodes.length !== bNodes.length) {
        return false;
    }
    return aNodes!.every((node, index) => isNodeMatch(node, bNodes![index]));
}

function groupClassesAndPseudoElements(nodes: Array<Partial<SelectorAstNode>>): nodeWithPseudo[] {
    const nodesWithPseudos: nodeWithPseudo[] = [];
    nodes.forEach(node => {
        if (node.type === 'class' || node.type === 'element') {
            nodesWithPseudos.push({...node, pseudo: []});
        } else if (node.type === 'pseudo-element') {
            nodesWithPseudos[nodesWithPseudos.length - 1].pseudo.push({...node});
        }
    });

    const nodesNoDuplicates: nodeWithPseudo[] = [];
    nodesWithPseudos.forEach(node => {
        if (node.pseudo.length || !nodesWithPseudos.find(n => isNodeMatch(n, node) && node !== n)) {
            nodesNoDuplicates.push(node);
        }
    });
    return nodesNoDuplicates;
}

const containsInTheEnd = (originalElements: nodeWithPseudo[],
                          currentMatchingElements: nodeWithPseudo[]) => {
    const offset = originalElements.length - currentMatchingElements.length;
    let arraysEqual: boolean = false;
    if (offset >= 0 && currentMatchingElements.length > 0) {
        arraysEqual = true;
        for (let i = 0; i < currentMatchingElements.length; i++) {
            const a = originalElements[i + offset];
            const b = currentMatchingElements[i];
            if (a.name !== b.name || a.type !== b.type || !isPseudoDiff(a, b)) {
                arraysEqual = false;
                break;
            }
        }
    }
    return arraysEqual;
};

export function matchSelectorTarget(sourceSelector: string, targetSelector: string): boolean {
    const a = separateChunks(parseSelector(sourceSelector));
    const b = separateChunks(parseSelector(targetSelector));

    if (a.length > 1) {
        throw new Error('source selector must not be composed of more than one compound selector');
    }
    const lastChunkA = getLastChunk(a[0]);
    const relevantChunksA = groupClassesAndPseudoElements(
        filterChunkNodesByType(lastChunkA, ['class', 'element', 'pseudo-element']));

    return b.some(compoundSelector => {
        const lastChunkB = getLastChunk(compoundSelector);
        let relevantChunksB =
            groupClassesAndPseudoElements(filterChunkNodesByType(lastChunkB, ['class', 'element', 'pseudo-element']));

        relevantChunksB = relevantChunksB.filter(nodeB => relevantChunksA.find(nodeA => isNodeMatch(nodeA, nodeB)));
        return containsInTheEnd(relevantChunksA, relevantChunksB);
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

export function isChildOfAtRule(rule: postcss.Rule, atRuleName: string) {
    return rule.parent && rule.parent.type === 'atrule' && rule.parent.name === atRuleName;
}

export function isCompRoot(name: string) {
    return name.charAt(0).match(/[A-Z]/);
}

export function createWarningRule(
    extendedNode: string,
    scopedExtendedNode: string,
    extendedFile: string,
    extendingNode: string,
    scopedExtendingNode: string,
    extendingFile: string) {
    // tslint:disable-next-line:max-line-length
    const message = `"class extending component '.${extendingNode} => ${scopedExtendingNode}' in stylesheet '${extendingFile}' was set on a node that does not extend '.${extendedNode} => ${scopedExtendedNode}' from stylesheet '${extendedFile}'" !important`;
    return postcss.rule({
        selector: `.${extendingNode}:not(.${extendedNode})::before`,
        nodes: [
            postcss.decl({
                prop: 'content',
                value: message
            }),
            postcss.decl({
                prop: 'display',
                value: `block !important`
            }),
            postcss.decl({
                prop: 'font-family',
                value: `monospace !important`
            }),
            postcss.decl({
                prop: 'background-color',
                value: `red !important`
            }),
            postcss.decl({
                prop: 'color',
                value: `white !important`
            })
        ]
    });
}
