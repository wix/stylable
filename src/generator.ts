import { PartialObject } from "./index.d";
import { parseSelector, stringifySelector, traverseNode } from './parser';
import { Stylesheet } from './stylesheet';

const postcss = require("postcss");
const postcssConfig = { parser: require("postcss-js") };
const processor = postcss();

export interface Config {
    namespaceDivider: string;
    resolver: { resolve: () => Stylesheet | null }
}

const DEFAULT_CONFIG = {
    namespaceDivider: "💠",
    resolver: { resolve: () => null }
};

export class Generator {
    private config: Config;
    constructor(config: PartialObject<Config>, public buffer: string[] = []) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    add(sheet: Stylesheet) {
        for (var selector in sheet.cssDefinition) {
            this.addSelector(selector, sheet.cssDefinition[selector], sheet.namespace);
        }
    }
    addSelector(selector: string, rules: any, namespace: string) {
        if (selector.match(/^:import/)) { return; }
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
