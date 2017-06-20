import { Pojo } from './index.d';
import { isOnlyElementOrClassSelector, SelectorAstNode, traverseNode } from './selector-utils';
import { TypedClass, Meta } from './stylesheet';
import { parse as parseCSS } from "postcss";

const postjs = require("postcss-js");
const tokenizer = require("css-selector-tokenizer");


export function generateMetaFromCSS(css: string) {
    return generateMetaFromDefinition(postjs.objectify(parseCSS(css)));
}

export function createMeta(cssDefinition = {}, classes = {}, typedClasses = {}): Meta {
    return { cssDefinition, classes, typedClasses };
}

function generateMetaFromDefinition(cssDefinition: any): Meta {
    const meta: Meta = createMeta(cssDefinition);
    Object.keys(cssDefinition).forEach((selector: string) => {
        const ast = tokenizer.parse(selector);
        addTypedClasses(selector, ast, cssDefinition[selector], meta.typedClasses);
        traverseNode(ast, (node) => addClassNames(meta.classes, node));
    });
    return meta;
}


const hasOwn = Function.prototype.call.bind(Object.prototype.hasOwnProperty);

function addTypedClasses(selector: string, ast: SelectorAstNode, rules: Pojo<string>, typedClasses: Pojo<TypedClass>) {
    const isSimpleSelector = isOnlyElementOrClassSelector(ast);
    const name = selector.replace('.', '');
    if (hasOwn(rules, 'SbRoot')) {
        if (isSimpleSelector) {
            typedClasses[name] = {
                SbRoot: rules['SbRoot'] === 'false' ? false : true
            };
        } else {
            throw new Error('-sb-root on complex selector: ' + selector);
        }
    }
}

function addClassNames(acc: Pojo<string>, node: SelectorAstNode) {
    if (node.type === 'class') {
        acc[node.name] = node.name;
    }
}