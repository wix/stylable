import { PartialObject } from "./index.d";
import { parseSelector, stringifySelector, traverseNode } from './parser';
import { Stylesheet } from './stylesheet';

const postcss = require("postcss");
const postcssConfig = { parser: require("postcss-js") };
const processor = postcss();

export interface Config {
    namespaceDivider: string;
    resolver: { resolve: () => Stylesheet }
}

export class Generator {
    constructor(private config: PartialObject<Config>, public buffer: string[] = []) { }
    add(selector: string, rules: any, namespace: string) {
        if (selector.match(/:import/)) { return; }
        this.buffer.push(processor.process({
            [this.scopeSelector(selector, namespace)]: rules
        }, postcssConfig).css);
    }
    scopeSelector(selector: string, namespace: string) {
        const ast = parseSelector(selector);
        traverseNode(ast, (node) => {
            if (node.type === 'class' && namespace) {
                node.name = namespace + this.config.namespaceDivider + node.name
            }
        });
        return stringifySelector(ast);
    }
}
