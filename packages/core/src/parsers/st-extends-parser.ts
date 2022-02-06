import type { PseudoElement } from '@tokey/css-selector-parser';
import type { ClassSymbol, ElementSymbol } from '../features';
import type { StylableMeta } from '../stylable-meta';
import type { StylableResolver } from '../stylable-resolver';
import { parseCSSValue } from '@tokey/css-value-parser';

type ParsedNodes = ReturnType<typeof parseCSSValue>[number];

export class ExpNode<T = string> {
    constructor(
        public left?: T | ExpNode<T>,
        public right?: T | ExpNode<T>,
        public op?: '&' | '|'
    ) {}
    clone() {
        return new ExpNode<T>(this.left, this.right, this.op);
    }
    toString() {
        const op = this.op === '&' ? `and` : 'or';
        return `${op}(${this.left}, ${this.right})`;
    }
}

export function stExtendsParser(stExtends: string) {
    const ast = parseCSSValue(stExtends);
    const outputTree = new ExpNode();
    const stack: ExpNode[] = [outputTree];
    for (const node of ast) {
        handleNode(stack, node);
    }
    if (stack.length !== 1) {
        throw new Error('unclosed parenthesis');
    }
    optimizeTree(outputTree);
    return outputTree;
}

function handleNode(stack: ExpNode[], node: ParsedNodes) {
    const currentNode = stack[stack.length - 1];
    if (node.type === '<custom-ident>') {
        if (!handleConnectedCustomIdent(stack, node)) {
            if (currentNode.op) {
                currentNode.right = node.value;
            } else {
                currentNode.left = node.value;
            }
        }
    } else if (node.type === 'literal' && node.value === '&') {
        if (currentNode.op) {
            pushRight(currentNode, node.value, stack);
        } else {
            if (!currentNode.left) {
                throw new Error(`missing expression left side before ${node.value} operator`);
            }
            currentNode.op = node.value;
        }
    } else if (node.type === 'literal' && node.value === '|') {
        if (currentNode.op === '&') {
            pullLeft(currentNode, node.value);
        } else if (currentNode.op === '|') {
            pushRight(currentNode, node.value, stack);
        } else {
            if (!currentNode.left) {
                throw new Error(`missing expression left side before ${node.value} operator`);
            }
            currentNode.op = node.value;
        }
    } else if (node.type === 'literal' && node.value === '(') {
        currentNode[currentNode.op ? 'right' : 'left'] = pushStack(stack);
    } else if (node.type === 'literal' && node.value === ')') {
        if (currentNode.op && currentNode.right === undefined) {
            throw new Error(`missing expression right side after ${currentNode.op} operator`);
        } else if (currentNode.left === undefined) {
            throw new Error('empty parenthesis');
        } else {
            stack.pop();
        }
    } else if (node.type !== 'space' && node.type !== 'comment') {
        throw new Error(`invalid node type ${node.type} with value ${node.value}`);
    }
}

function pushStack(stack: ExpNode[]) {
    const newNode = new ExpNode();
    stack.push(newNode);
    return newNode;
}

function pullLeft(currentNode: ExpNode, op: '&' | '|') {
    if (!currentNode.right) {
        throw new Error(`missing value between ${currentNode.op} and ${op} operators`);
    }
    currentNode.left = currentNode.clone();
    currentNode.right = undefined;
    currentNode.op = op;
}

function pushRight(currentNode: ExpNode, op: '&' | '|', stack: ExpNode[]) {
    if (!currentNode.right) {
        throw new Error(`missing value between ${currentNode.op} and ${op} operators`);
    }
    const newNode = new ExpNode(currentNode.right, undefined, op);
    currentNode.right = newNode;
    stack.length--;
    stack.push(newNode);
}

function optimizeTree(stNode: string | ExpNode, parent?: ExpNode) {
    if (typeof stNode === 'string') {
        return;
    }
    if (stNode.left) {
        optimizeTree(stNode.left, stNode);
    }
    if (stNode.right) {
        optimizeTree(stNode.right, stNode);
    }
    if (!parent) {
        return;
    }
    if (parent.op === stNode.op || parent.op === undefined) {
        if (!stNode.right) {
            if (parent.left === stNode) {
                parent.left = stNode.left;
            } else if (parent.right === stNode) {
                parent.right = stNode.left;
            }
        } else if (!parent.right) {
            parent.left = stNode.left;
            parent.right = stNode.right;
            parent.op = stNode.op;
        }
    }
}

function handleConnectedCustomIdent(stack: ExpNode[], node: ParsedNodes) {
    const parts = node.value.split(/(?=|)|(?=&)/gm);
    if (parts.length > 1) {
        let offset = 0;
        for (const part of parts) {
            handleNode(stack, {
                type: part === '|' || part === '&' ? 'literal' : '<custom-ident>',
                value: part,
                start: node.start + offset,
                end: node.start + offset + part.length,
                before: '',
                after: '',
            });
            offset += part.length;
        }
        return true;
    }
    return false;
}

export function resolveType(
    resolved: { meta: StylableMeta; symbol?: ClassSymbol | ElementSymbol }[],
    innerPart: null | PseudoElement,
    resolver: StylableResolver
): { errors: string[]; resolved: { meta: StylableMeta; symbol?: ClassSymbol | ElementSymbol }[] } {
    /** */
    return { resolved, innerPart, resolver } as any;
}
