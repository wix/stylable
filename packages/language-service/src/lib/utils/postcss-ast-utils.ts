import type * as postcss from 'postcss';
import type { ProviderPosition } from '../completion-providers.js';

export function isInNode(
    position: ProviderPosition,
    node: postcss.Node,
    includeSelector = false,
): boolean {
    const nodeStart = node.source?.start;
    const nodeEnd = node.source?.end;

    if (!node.source) {
        return false;
    }
    if (!nodeStart) {
        return false;
    }
    if (nodeStart.line > position.line) {
        return false;
    }
    if (nodeStart.line === position.line && nodeStart.column > position.character) {
        return false;
    }
    if (!nodeEnd) {
        if (!isBeforeRuleset(position, node)) {
            return true;
        }
        const nodes = (node as postcss.Container).nodes;
        return nodes ? nodes.length > 0 : false;
    }
    if (nodeEnd.line < position.line) {
        return false;
    }
    if (nodeEnd.line === position.line && nodeEnd.column < position.character) {
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

export function isBeforeRuleset(position: ProviderPosition, node: postcss.Node) {
    const part = node
        .source!.input.css.split('\n')
        .slice(node.source!.start!.line - 1, node.source!.end ? node.source!.end.line : undefined);
    if (part.findIndex((s) => s.includes('{')) + node.source!.start!.line > position.line) {
        return true;
    }
    if (part[position.line - node.source!.start!.line].indexOf('{') >= position.character) {
        return true;
    }
    return false;
}

export function isAfterRuleset(position: ProviderPosition, node: postcss.Node) {
    const part = node
        .source!.input.css.split('\n')
        .slice(node.source!.start!.line - 1, node.source!.end!.line);
    if (part.findIndex((s) => s.includes('}')) + node.source!.start!.line < position.line) {
        return true;
    }
    if (
        part[position.line - node.source!.start!.line].includes('}') &&
        part[position.line - node.source!.start!.line].indexOf('}') < position.character
    ) {
        return true;
    }
    return false;
}

const { hasOwnProperty } = Object.prototype;

export function isContainer(node: postcss.Node): node is postcss.Container {
    return hasOwnProperty.call(node, 'nodes');
}

export function isSelector(node: postcss.Node): node is postcss.Rule {
    return hasOwnProperty.call(node, 'selector');
}

export function isVars(node: postcss.Node) {
    return hasOwnProperty.call(node, 'selector') && (node as postcss.Rule).selector === ':vars';
}

export function isDeclaration(node: postcss.Node): node is postcss.Declaration {
    return hasOwnProperty.call(node, 'prop');
}

export function isComment(node: postcss.Node): node is postcss.Comment {
    return hasOwnProperty.call(node, 'type') && (node as postcss.Comment).type === 'comment';
}

export function isRoot(node: postcss.Node): node is postcss.Root {
    return hasOwnProperty.call(node, 'type') && (node as postcss.Root).type === 'root';
}

export function pathFromPosition(
    ast: postcss.AnyNode,
    position: ProviderPosition,
    res: postcss.AnyNode[] = [],
    includeSelector = false,
): postcss.AnyNode[] {
    res.push(ast);
    if (isContainer(ast) && ast.nodes) {
        const childNode = ast.nodes.find((node) => {
            return isInNode(position, node, includeSelector);
        });
        if (childNode) {
            return pathFromPosition(childNode, position, res, includeSelector);
        }
    }
    return res;
}

export function getAtRuleByPosition(
    ast: postcss.Root,
    position: ProviderPosition,
    atRuleName: string,
): postcss.AtRule | undefined {
    let res: postcss.AtRule | undefined;
    ast.walkAtRules(atRuleName, (atRule) => {
        const nodeStart = atRule.source?.start;
        const sLine = nodeStart!.line - 1;
        const sChar = nodeStart!.column - 1;
        const nodeEnd = atRule.source?.end;
        const eLine = nodeEnd!.line - 1;
        const eChar = nodeEnd!.column - 1;

        if (
            (position.line === sLine &&
                position.character >= sChar &&
                position.line === eLine &&
                position.character <= eChar) ||
            (position.line > sLine && position.line < eLine)
        ) {
            res = atRule;
            return false;
        }

        return undefined;
    });

    return res;
}

// todo rename this function
export function getOffsetFromPosition(src: string, position: ProviderPosition) {
    const lines = src.split('\n');
    return (
        lines.slice(0, position.line).reduce((total: number, line) => line.length + total + 1, -1) +
        position.character
    );
}
