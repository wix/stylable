import { expect } from 'chai';
import { parseCSSValue } from '@tokey/css-value-parser';

class stNode {
    constructor(
        public left?: string | stNode,
        public right?: string | stNode,
        public op?: '&' | '|'
    ) {}
    clone() {
        return new stNode(this.left, this.right, this.op);
    }
    toString() {
        const op = this.op === '&' ? `and` : 'or';
        return `${op}(${this.left}, ${this.right})`;
    }
}

function stExtendsParser(stExtends: string) {
    const ast = parseCSSValue(stExtends);
    const outputTree = new stNode();
    const stack: stNode[] = [outputTree];
    for (const node of ast) {
        const currentNode = stack[stack.length - 1];
        if (node.type === '<custom-ident>') {
            if (currentNode.op) {
                currentNode.right = node.value;
            } else {
                currentNode.left = node.value;
            }
        } else if (node.type === 'literal' && node.value === '&') {
            if (currentNode.op) {
                pushRight(currentNode, node.value, stack);
            } else {
                currentNode.op = node.value;
            }
        } else if (node.type === 'literal' && node.value === '|') {
            if (currentNode.op === '&') {
                pullLeft(currentNode, node.value);
            } else if (currentNode.op === '|') {
                pushRight(currentNode, node.value, stack);
            } else {
                currentNode.op = node.value;
            }
        } else if (node.type === 'literal' && node.value === '(') {
            currentNode[currentNode.op ? 'right' : 'left'] = pushStack(stack);
        } else if (node.type === 'literal' && node.value === ')') {
            if (currentNode.op && currentNode.right === undefined) {
                throw new Error('Invalid ST Extends');
            } else if (currentNode.left === undefined) {
                throw new Error('Invalid ST Extends');
            } else {
                stack.pop();
            }
        } else if (node.type !== 'space' && node.type !== 'comment') {
            throw new Error('Invalid ST Extends');
        }
    }
    optimizeTree(outputTree);
    return outputTree;
}

function pushStack(stack: stNode[]) {
    const newNode = new stNode();
    stack.push(newNode);
    return newNode;
}

function pullLeft(currentNode: stNode, op: '&' | '|') {
    if (!currentNode.right) {
        throw new Error('Invalid ST Extends');
    }
    currentNode.left = currentNode.clone();
    currentNode.right = undefined;
    currentNode.op = op;
}

function pushRight(currentNode: stNode, op: '&' | '|', stack: stNode[]) {
    if (!currentNode.right) {
        throw new Error('Invalid ST Extends');
    }
    const newNode = new stNode(currentNode.right, undefined, op);
    currentNode.right = newNode;
    stack.length--;
    stack.push(newNode);
}

function optimizeTree(stNode: string | stNode, parent?: stNode) {
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

describe('-st-extends parser', () => {
    it('parse single', () => {
        const ast = stExtendsParser('a');
        expect(ast).to.eql(new stNode('a'));
    });
    it('parse single |', () => {
        const ast = stExtendsParser('a | b');
        expect(ast).to.eql(new stNode('a', 'b', '|'));
    });

    it('parse multi |', () => {
        const ast = stExtendsParser('a | b | c');
        expect(ast).to.eql(new stNode('a', new stNode('b', 'c', '|'), '|'));
    });

    it('parse single &', () => {
        const ast = stExtendsParser('a & b');
        expect(ast).to.eql(new stNode('a', 'b', '&'));
    });

    it('parse multi &', () => {
        const ast = stExtendsParser('a & b & c');
        expect(ast).to.eql(new stNode('a', new stNode('b', 'c', '&'), '&'));
    });

    it('parse operator order |&', () => {
        const ast = stExtendsParser('a | b & c');
        expect(ast).to.eql(new stNode('a', new stNode('b', 'c', '&'), '|'));
    });

    it('parse operator order &|', () => {
        const ast = stExtendsParser('a & b | c');
        expect(ast).to.eql(new stNode(new stNode('a', 'b', '&'), 'c', '|'));
    });

    it('parse single | with parens', () => {
        const ast = stExtendsParser('(a | b)');
        expect(ast).to.eql(new stNode('a', 'b', '|'));
    });

    it('parse operator order parens |&', () => {
        const ast = stExtendsParser('(a | b) & c');
        expect(ast).to.eql(new stNode(new stNode('a', 'b', '|'), 'c', '&'));
    });

    it('parse operator order parens &|', () => {
        const ast = stExtendsParser('a & (b | c)');
        expect(ast).to.eql(new stNode('a', new stNode('b', 'c', '|'), '&'));
    });

    it('unwrap complex expression', () => {
        const ast = stExtendsParser('(((a | b) | c))');
        expect(ast).to.eql(new stNode(new stNode('a', 'b', '|'), 'c', '|'));
    });

    it('unwrap single expression', () => {
        const ast = stExtendsParser('(((a)))');
        expect(ast).to.eql(new stNode('a'));
    });
});
