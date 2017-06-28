// import { parse as parseCSS } from "postcss";
// const postjs = require("postcss-js");
const tokenizer = require("css-selector-tokenizer");

const stylis = require("../stylis");
const plugin = require("../plugin");

stylis.set({ compress: false, lossless: true });
stylis.use(false);
stylis.use(plugin);


const postcssjs = require("postcss-js");
const postcss = require("postcss");
const postcssConfig = { parser: postcssjs };
const processor = postcss();


export interface SelectorAstNode {
    type: string;
    name: string;
    nodes: SelectorAstNode[];
    content?: string;
    before?: string;
};

export interface PseudoSelectorAstNode extends SelectorAstNode {
    type: "pseudo-class"
    content: string;
};

export const hasOwn = Function.prototype.call.bind(Object.prototype.hasOwnProperty);

export const SBTypesParsers = {
    SbRoot: (value: string) => {
        return value === 'false' ? false : true
    },
    SbStates: (value: string) => {
        return value ? value.split(',').map((state) => state.trim()) : [];
    },
    SbType: (value: string) => {
        return value ? value.trim() : "";
    }
}

export function stringifyCSSObject(cssObject: any): string {
    return processor.process(cssObject, postcssConfig).css;
}


export function objectifyCSSStylis(css: string) {
    return stylis('', css);
}

export function objectifyCSS(css: string) {
    return postcssjs.objectify(postcss.parse(css));
}

export function parseSelector(selector: string) {
    return tokenizer.parse(selector);
}

export function stringifySelector(ast: SelectorAstNode) {
    return tokenizer.stringify(ast)
}

export type Visitor = (node: SelectorAstNode, index: number) => boolean | void;
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

export function createChecker(types: Array<string | string[]>) {
    return function () {
        let index = 0;
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
}

export const createSimpleSelectorChecker = createChecker(['selectors', 'selector', ['element', 'class']]);

