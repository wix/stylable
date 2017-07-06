import { CSSObject } from "./types";

const tokenizer = require("css-selector-tokenizer");

const objectify = require("../modules/post-css-objectify");
const stylis = require("../modules/stylis");
const plugin = require("../modules/plugin");
const stylableObjectifyConfig = {
    noCamel: [/^-sb-/],
    noCamelSelector: [/^:vars$/]
};

stylis.set({ compress: false, lossless: true });
stylis.use(false);

stylis.use(plugin(stylableObjectifyConfig));

const postcssJS = require("postcss-js");
const postcssNested = require("postcss-nested");
const postcss = require("postcss");
const postcssConfig = { parser: postcssJS };
const processor = postcss([postcssNested]);


export interface SelectorAstNode {
    type: string;
    name: string;
    nodes: SelectorAstNode[];
    content?: string;
    before?: string;
};

export interface PseudoSelectorAstNode extends SelectorAstNode {
    type: "pseudo-class";
    content: string;
};

export const hasOwn = Function.prototype.call.bind(Object.prototype.hasOwnProperty);

export const SBTypesParsers = {
    "-sb-root"(value: string) {
        return value === 'false' ? false : true
    },
    "-sb-states"(value: string) {
        return value ? value.split(',').map((state) => state.trim()) : [];
    },
    "-sb-type"(value: string) {
        return value ? value.trim() : "";
    },
    "-sb-mixin"(value: string) {

        const parts = value.match(/\s*[A-Za-z$_][$_\w]*\(.*?\)\)?|\s*([A-Za-z$_][$_\w]*\s*)/g);
        if (!parts || parts.join('').length !== value.replace(/\s*/, '').length) {
            throw new Error('-sb-mixin: not a valid mixin value: ' + value);
        }

        return parts.map((mix) => {
            let type: string, options: string[], match;

            if (mix.indexOf('(') === -1) {
                type = mix.trim();
                options = [];
            } else if (match = mix.match(/(.*?)\((.*?\)?)\)/)) {
                type = match[1].trim();
                options = match[2] ? match[2].split(',').map(x => x.trim()) : [];
            } else {
                throw new Error('Invalid mixin call:' + mix);
            }
            return { type, options }
        });

    }
}

export function stringifyCSSObject(cssObject: CSSObject): string {
    return processor.process(cssObject, postcssConfig).css;
}

export function objectifyCSSStylis(css: string): CSSObject {
    return stylis('', css);
}

export function objectifyCSS(css: string): CSSObject {
    // return stylis('', css);
    return objectify(postcss.parse(css), stylableObjectifyConfig);
}

export function parseSelector(selector: string): SelectorAstNode {
    return tokenizer.parse(selector);
}

export function stringifySelector(ast: SelectorAstNode): string {
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

