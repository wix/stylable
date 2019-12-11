import postcss from 'postcss';
import { ProviderPosition } from '../completion-providers';

export function isInNode(
    position: ProviderPosition,
    node: postcss.NodeBase,
    includeSelector = false
): boolean {
    if (!node.source) {
        return false;
    }
    if (!node.source!.start) {
        return false;
    }
    if (node.source!.start!.line > position.line) {
        return false;
    }
    if (
        node.source!.start!.line === position.line &&
        node.source!.start!.column > position.character
    ) {
        return false;
    }
    if (!node.source!.end) {
        return (
            !isBeforeRuleset(position, node) ||
            (!!(node as postcss.ContainerBase).nodes &&
                !!((node as postcss.ContainerBase).nodes!.length > 0))
        );
    }
    if (node.source!.end!.line < position.line) {
        return false;
    }
    if (node.source!.end!.line === position.line && node.source!.end!.column < position.character) {
        return false;
    }
    if (isBeforeRuleset(position, node) && !includeSelector) {
        return false;
    }
    if (isAfterRuleset(position, node)) {
        return false;
    }
    return true;
}

export function isBeforeRuleset(position: ProviderPosition, node: postcss.NodeBase) {
    const part = ((node.source!.input as any).css as string)
        .split('\n')
        .slice(node.source!.start!.line - 1, node.source!.end ? node.source!.end!.line : undefined);
    if (part.findIndex(s => s.indexOf('{') !== -1) + node.source!.start!.line > position.line) {
        return true;
    }
    if (part[position.line - node.source!.start!.line].indexOf('{') >= position.character) {
        return true;
    }
    return false;
}

export function isAfterRuleset(position: ProviderPosition, node: postcss.NodeBase) {
    const part = ((node.source!.input as any).css as string)
        .split('\n')
        .slice(node.source!.start!.line - 1, node.source!.end!.line);
    if (part.findIndex(s => s.indexOf('}') !== -1) + node.source!.start!.line < position.line) {
        return true;
    }
    if (
        part[position.line - node.source!.start!.line].indexOf('}') > -1 &&
        part[position.line - node.source!.start!.line].indexOf('}') < position.character
    ) {
        return true;
    }
    return false;
}

export function isContainer(node: postcss.NodeBase): node is postcss.ContainerBase {
    return node.hasOwnProperty('nodes');
}

export function isSelector(node: postcss.NodeBase): node is postcss.Rule {
    return node.hasOwnProperty('selector');
}

export function isVars(node: postcss.NodeBase) {
    return node.hasOwnProperty('selector') && (node as postcss.Rule).selector === ':vars';
}

export function isDeclaration(node: postcss.NodeBase): node is postcss.Declaration {
    return node.hasOwnProperty('prop');
}

export function isComment(node: postcss.NodeBase): node is postcss.Comment {
    return node.hasOwnProperty('type') && (node as postcss.Comment).type === 'comment';
}

export function isRoot(node: postcss.NodeBase): node is postcss.Root {
    return node.hasOwnProperty('type') && (node as postcss.Root).type === 'root';
}

export function pathFromPosition(
    ast: postcss.NodeBase,
    position: ProviderPosition,
    res: postcss.NodeBase[] = [],
    includeSelector: boolean = false
): postcss.NodeBase[] {
    res.push(ast);
    if (isContainer(ast) && ast.nodes) {
        const childNode = ast.nodes.find((node: postcss.NodeBase) => {
            return isInNode(position, node, includeSelector);
        });
        if (childNode) {
            return pathFromPosition(childNode, position, res, includeSelector);
        }
    }
    return res;
}

export function getPositionInSrc(src: string, position: ProviderPosition) {
    const lines = src.split('\n');
    return (
        lines.slice(0, position.line).reduce((total: number, line) => line.length + total + 1, -1) +
        position.character
    );
}
