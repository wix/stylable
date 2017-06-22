import { parseSelector, stringifySelector, traverseNode } from './parser';

const postjs = require("postcss-js");
const postcss = require("postcss");
const processor = postcss();
const config = { parser: postjs };

export class InMemoryContext {
    constructor(public namespaceDivider: string, public buffer: string[] = []) { }
    add(selector: string, rules: any, namespace: string) {
        this.buffer.push(processor.process({
            [this.scopeSelector(selector, namespace)]: rules
        }, config).css);
    }
    scopeSelector(selector: string, namespace: string) {
        const ast = parseSelector(selector);
        traverseNode(ast, (node) => {
            if (node.type === 'class' && namespace) {
                node.name = namespace + this.namespaceDivider + node.name
            }
        });
        return stringifySelector(ast);
    }
}
