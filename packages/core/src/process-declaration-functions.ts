import type { Declaration } from 'postcss';
import { AnyValueNode, parseValues, stringifyValues } from 'css-selector-tokenizer';

export function processDeclarationFunctions(
    decl: Declaration,
    onFunction: (node: AnyValueNode) => void,
    transform = false
) {
    const ast = parseValues(decl.value);

    ast.nodes.forEach((node) => findFunction(node, onFunction));

    if (transform) {
        decl.value = stringifyValues(ast);
    }
}

function findFunction(node: AnyValueNode, onFunctionNode: (node: AnyValueNode) => void) {
    switch (node.type) {
        case 'value':
        case 'values':
            node.nodes.forEach((child) => findFunction(child, onFunctionNode));
            break;
        case 'url':
            onFunctionNode(node);
            break;
        case 'nested-item':
            onFunctionNode(node);
            node.nodes.forEach((child) => findFunction(child, onFunctionNode));
            break;
    }
}
