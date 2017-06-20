export declare type SelectorAstNode = {
    type: string;
    name: string;
    nodes: SelectorAstNode[];
};

export type Visitor = (node: SelectorAstNode, index: number) => boolean | void;

export function traverseNode(node: SelectorAstNode, visitor: Visitor, index: number = 0): boolean | void {
    if (!node) { return }
    let doNext = visitor(node, index);
    if (doNext === false) { return false; }
    if (node.nodes) {
        for (var i = 0; i < node.nodes.length; i++) {
            doNext = traverseNode(node.nodes[i], visitor, i);
            if (doNext === false) { return false; }
        }
    }
}

export function isOnlyElementOrClassSelector(ast: SelectorAstNode) {
    let index = 0;

    const types = ['selectors', 'selector', ['element', 'class']];

    const res = traverseNode(ast, (node) => {
        const matcher = types[index];
        if (Array.isArray(matcher)) {
            return matcher.indexOf(node.type) !== -1;
        } else if (matcher !== node.type) {
            return false
        }
        if (types[index] !== node.type) {
            return false;
        }
        index++;
        return true;
    });

    return res === false ? false : true;
}
