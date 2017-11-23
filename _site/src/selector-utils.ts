const tokenizer = require('css-selector-tokenizer');

export interface SelectorAstNode {
    type: string;
    name: string;
    nodes: SelectorAstNode[];
    content?: string;
    before?: string;
    value?: string;
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

export function traverseNode(
    node: SelectorAstNode,
    visitor: Visitor,
    index: number = 0,
    nodes: SelectorAstNode[] = [node]
): boolean | void {
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
