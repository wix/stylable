import { expect } from 'chai';
import { parseCSSValue } from '@tokey/css-value-parser';

type ParsedNodes = ReturnType<typeof parseCSSValue>[number];

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
        handleNode(stack, node);
    }
    if (stack.length !== 1) {
        throw new Error('unclosed parenthesis');
    }
    optimizeTree(outputTree);
    return outputTree;
}

function handleNode(stack: stNode[], node: ParsedNodes) {
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

function pushStack(stack: stNode[]) {
    const newNode = new stNode();
    stack.push(newNode);
    return newNode;
}

function pullLeft(currentNode: stNode, op: '&' | '|') {
    if (!currentNode.right) {
        throw new Error(`missing value between ${currentNode.op} and ${op} operators`);
    }
    currentNode.left = currentNode.clone();
    currentNode.right = undefined;
    currentNode.op = op;
}

function pushRight(currentNode: stNode, op: '&' | '|', stack: stNode[]) {
    if (!currentNode.right) {
        throw new Error(`missing value between ${currentNode.op} and ${op} operators`);
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

function handleConnectedCustomIdent(stack: stNode[], node: ParsedNodes) {
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

describe('-st-extends parser', () => {
    it('parse single', () => {
        const ast = stExtendsParser('a');
        expect(ast).to.eql(new stNode('a'));
    });

    it('parse single |', () => {
        const ast = stExtendsParser('a | b');
        expect(ast).to.eql(new stNode('a', 'b', '|'));
        const ast2 = stExtendsParser('a|b');
        expect(ast2).to.eql(new stNode('a', 'b', '|'));
    });

    it('parse multi |', () => {
        const ast = stExtendsParser('a | b | c');
        expect(ast).to.eql(new stNode('a', new stNode('b', 'c', '|'), '|'));
    });

    it('parse single &', () => {
        const ast = stExtendsParser('a & b');
        expect(ast).to.eql(new stNode('a', 'b', '&'));
        const ast2 = stExtendsParser('a&b');
        expect(ast2).to.eql(new stNode('a', 'b', '&'));
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

    describe('errors', () => {
        it('unclosed parenthesis', () => {
            expect(() => {
                stExtendsParser('(');
            }).to.throw('unclosed parenthesis');
        });

        it('empty parenthesis', () => {
            expect(() => {
                stExtendsParser('()');
            }).to.throw('empty parenthesis');
        });

        it('missing expression right side |', () => {
            expect(() => {
                stExtendsParser('(a|)');
            }).to.throw('missing expression right side after | operator');
        });

        it('missing expression right side &', () => {
            expect(() => {
                stExtendsParser('(a&)');
            }).to.throw('missing expression right side after & operator');
        });

        it('missing expression left side |', () => {
            expect(() => {
                stExtendsParser('(|a)');
            }).to.throw('missing expression left side before | operator');
            expect(() => {
                stExtendsParser('|a');
            }).to.throw('missing expression left side before | operator');
        });

        it('missing expression left side &', () => {
            expect(() => {
                stExtendsParser('(&a)');
            }).to.throw('missing expression left side before & operator');
            expect(() => {
                stExtendsParser('&a');
            }).to.throw('missing expression left side before & operator');
        });

        it('consecutive | operators (no space)', () => {
            expect(() => {
                stExtendsParser('||');
            }).to.throw(`invalid node type literal with value ||`);
        });

        it('consecutive & operators (no space)', () => {
            expect(() => {
                stExtendsParser('&&');
            }).to.throw(`invalid node type literal with value &&`);
        });

        it('consecutive &| operators (no space)', () => {
            expect(() => {
                stExtendsParser('&|');
            }).to.throw(`invalid node type literal with value &|`);
        });

        it('consecutive |& operators (no space)', () => {
            expect(() => {
                stExtendsParser('|&');
            }).to.throw(`invalid node type literal with value |&`);
        });

        it('missing value with | first', () => {
            expect(() => {
                stExtendsParser('a | |');
            }).to.throw(`missing value between | and | operators`);
            expect(() => {
                stExtendsParser('a | &');
            }).to.throw(`missing value between | and & operators`);
        });

        it('missing value with & first', () => {
            expect(() => {
                stExtendsParser('a & |');
            }).to.throw(`missing value between & and | operators`);
            expect(() => {
                stExtendsParser('a & &');
            }).to.throw(`missing value between & and & operators`);
        });
    });
});
