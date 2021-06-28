import {
    SelectorAstNode,
    separateChunks,
    parseSelector,
    filterChunkNodesByType,
    isNodeMatch,
    SelectorChunk,
} from '../selector-utils';

type nodeWithPseudo = Partial<SelectorAstNode> & { pseudo: Array<Partial<SelectorAstNode>> };

export function matchSelectorTarget(sourceSelector: string, targetSelector: string): boolean {
    const a = separateChunks(parseSelector(sourceSelector));
    const b = separateChunks(parseSelector(targetSelector));

    if (a.length > 1) {
        throw new Error('source selector must not be composed of more than one compound selector');
    }
    const lastChunkA = getLastChunk(a[0]);
    const relevantChunksA = groupClassesAndPseudoElements(
        filterChunkNodesByType(lastChunkA, ['class', 'element', 'pseudo-element'])
    );

    return b.some((compoundSelector) => {
        const lastChunkB = getLastChunk(compoundSelector);
        let relevantChunksB = groupClassesAndPseudoElements(
            filterChunkNodesByType(lastChunkB, ['class', 'element', 'pseudo-element'])
        );

        relevantChunksB = relevantChunksB.filter((nodeB) =>
            relevantChunksA.find((nodeA) => isNodeMatch(nodeA, nodeB))
        );
        return containsInTheEnd(relevantChunksA, relevantChunksB);
    });
}

const containsInTheEnd = (
    originalElements: nodeWithPseudo[],
    currentMatchingElements: nodeWithPseudo[]
) => {
    const offset = originalElements.length - currentMatchingElements.length;
    let arraysEqual = false;
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
function isPseudoDiff(a: nodeWithPseudo, b: nodeWithPseudo) {
    const aNodes = a.pseudo;
    const bNodes = b.pseudo;

    if (!aNodes || !bNodes || aNodes.length !== bNodes.length) {
        return false;
    }
    return aNodes.every((node, index) => isNodeMatch(node, bNodes[index]));
}
function getLastChunk(selectorChunk: SelectorChunk[]): SelectorChunk {
    return selectorChunk[selectorChunk.length - 1];
}
function groupClassesAndPseudoElements(nodes: Array<Partial<SelectorAstNode>>): nodeWithPseudo[] {
    const nodesWithPseudos: nodeWithPseudo[] = [];
    nodes.forEach((node) => {
        if (node.type === 'class' || node.type === 'element') {
            nodesWithPseudos.push({ ...node, pseudo: [] });
        } else if (node.type === 'pseudo-element') {
            nodesWithPseudos[nodesWithPseudos.length - 1].pseudo.push({ ...node });
        }
    });

    const nodesNoDuplicates: nodeWithPseudo[] = [];
    nodesWithPseudos.forEach((node) => {
        if (
            node.pseudo.length ||
            !nodesWithPseudos.find((n) => isNodeMatch(n, node) && node !== n)
        ) {
            nodesNoDuplicates.push(node);
        }
    });
    return nodesNoDuplicates;
}
