import type { Declaration } from 'postcss';
import { AnyValueNode, parseValues, stringifyValues } from 'css-selector-tokenizer';

export type OnFunction = (node: AnyValueNode, level: number) => void;

export function processDeclarationFunctions(
    decl: Declaration,
    onFunction: OnFunction,
    transform = false
) {
    const ast = parseValues(decl.value);

    ast.nodes.forEach((node) => findFunction(node, onFunction, 1));

    if (transform) {
        decl.value = stringifyValues(ast);
    }
}

function findFunction(node: AnyValueNode, onFunctionNode: OnFunction, level: number) {
    switch (node.type) {
        case 'value':
        case 'values':
            onFunctionNode(node, level);
            node.nodes.forEach((child) => findFunction(child, onFunctionNode, level));
            break;
        case 'url':
        case 'item':
            onFunctionNode(node, level);
            break;
        case 'nested-item':
            onFunctionNode(node, level);
            node.nodes.forEach((child) => findFunction(child, onFunctionNode, level + 1));
            break;
    }
}
