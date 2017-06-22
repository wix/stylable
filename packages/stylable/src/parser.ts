import { parse as parseCSS } from "postcss";
const postjs = require("postcss-js");
const tokenizer = require("css-selector-tokenizer");


export interface SelectorAstNode {
    type: string;
    name: string;
    nodes: SelectorAstNode[];
};

export interface PseudoSelectorAstNode extends SelectorAstNode  {
    type: "pseudo-class"
    content: string;
};


export type Visitor = (node: SelectorAstNode, index: number) => boolean | void;


export const hasOwn = Function.prototype.call.bind(Object.prototype.hasOwnProperty);

export function objectifyCSS(css: string) {
    return postjs.objectify(parseCSS(css));
}

export function parseSelector(selector: string) {
    return tokenizer.parse(selector);
}

export function stringifySelector(ast: SelectorAstNode){
    return tokenizer.stringify(ast)
}

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

export function createSimpleSelectorChecker() {
    let index = 0;
    const types = ['selectors', 'selector', ['element', 'class']];
   
    return (node: SelectorAstNode) => {
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
    }

}
