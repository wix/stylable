import { PartialObject } from './index.d';
import { parseSelector, SelectorAstNode, stringifySelector, traverseNode } from './parser';
import { Stylesheet } from './stylesheet';

const postcss = require("postcss");
const postcssConfig = { parser: require("postcss-js") };
const processor = postcss();

export interface Config {
    namespaceDivider: string;
    resolver: { resolve: (path: string) => Stylesheet | null }
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

        sheet.imports.forEach((importDef)=>{
            const resolved = this.config.resolver.resolve(importDef.SbFrom);
            resolved && this.add(resolved);
        });

        for (const selector in sheet.cssDefinition) {
            const ast = parseSelector(selector);
            const rules = sheet.cssDefinition[selector];
            if (isImport(ast)) { continue; }
            this.buffer.push(processor.process({
                [this.scopeSelector(sheet, selector, ast)]: rules
            }, postcssConfig).css);
        }
    }
    scopeSelector(sheet: Stylesheet, selector: string, ast: SelectorAstNode) {
        let current = sheet;
        traverseNode(ast, (node) => {
            const { name, type } = node;
            if (type === 'class') {
                const next = sheet.resolve(this.config.resolver, name);
                if(next !== current){
                    node.before = '.' + this.scope(name, current.namespace);
                    node.name = this.scope(next.root, next.namespace);
                    current = next;
                } else {
                    node.name = this.scope(name, current.namespace);
                }
            } else if (type === 'pseudo-element') {
                node.type = 'class';
                node.before = ' ';
                node.name = this.scope(name, current.namespace);
            }
        });
        return stringifySelector(ast);
    }
    scope(name: string, namespace: string) {
        return namespace ? namespace + this.config.namespaceDivider + name : name;
    }
}

function isImport(ast: SelectorAstNode): boolean {
    const selectors = ast.nodes[0];
    const selector = selectors && selectors.nodes[0];
    return selector && selector.type === "pseudo-class" && selector.name === 'import';
}