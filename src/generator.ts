import { PartialObject } from './index.d';
import { parseSelector, SelectorAstNode, stringifySelector, traverseNode } from './parser';
import { Resolver } from './resolver';
import { Stylesheet, TypedClass } from './stylesheet';

const postcss = require("postcss");
const postcssConfig = { parser: require("postcss-js") };
const processor = postcss();

export interface Config {
    namespaceDivider: string;
    resolver: Resolver;
}

const DEFAULT_CONFIG: Config = {
    namespaceDivider: "💠",
    resolver: new Resolver({})
};

export class Generator {
    private config: Config;
    constructor(config: PartialObject<Config>, public buffer: string[] = []) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    addEntry(sheet: Stylesheet) {
        this.addImports(sheet);
        this.addSelectors(sheet);
    }
    addImports(sheet: Stylesheet) {
        sheet.imports.forEach((importDef) => {
            const resolved = this.config.resolver.resolveModule(importDef.SbFrom);
            resolved && this.addEntry(resolved);
        });
    }
    addSelectors(sheet: Stylesheet) {
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
        let typedClass: TypedClass;
        traverseNode(ast, (node) => {
            const { name, type } = node;
            if (type === 'selector') {
                typedClass = sheet.typedClasses[sheet.root];
                current = sheet;
            } else if (type === 'class') {
                typedClass = current.typedClasses[name];
                current = this.handleClass(current, node, name);
            } else if (type === 'element') {
                current = this.handleElement(current, node, name);
            } else if (type === 'pseudo-element') {
                current = this.handlePseudoElement(current, node, name);
                typedClass = current.typedClasses[name];
            } else if (type === 'pseudo-class') {
                current = this.handlePseudoClass(current, node, name, typedClass);
            }
        });
        return stringifySelector(ast);
    }
    handleClass(sheet: Stylesheet, node: SelectorAstNode, name: string) {
        const next = sheet.resolve(this.config.resolver, name);
        if (next !== sheet) {
            //root to root
            node.before = '.' + this.scope(name, sheet.namespace);
            node.name = this.scope(next.root, next.namespace);
            sheet = next;
        } else {
            //not type
            node.name = this.scope(name, sheet.namespace);
        }
        return sheet;
    }
    handleElement(sheet: Stylesheet, node: SelectorAstNode, name: string) {
        const next = sheet.resolve(this.config.resolver, name);
        if (next !== sheet) {
            //element selector root to root
            node.before = '.' + this.scope(sheet.root, sheet.namespace) + ' ';
            node.name = this.scope(next.root, next.namespace);
            node.type = 'class';
            sheet = next;
        }
        return sheet;
    }
    handlePseudoElement(sheet: Stylesheet, node: SelectorAstNode, name: string) {
        node.type = 'class';
        node.before = ' ';
        node.name = this.scope(name, sheet.namespace);
        return sheet.resolve(this.config.resolver, name);
    }
    handlePseudoClass(sheet: Stylesheet, node: SelectorAstNode, name: string, typedClass: TypedClass){
        if(typedClass && typedClass.SbStates && typedClass.SbStates.indexOf(name) !== -1){
            node.type = 'attribute';
            node.content = `${sheet.generateStateAttribute(name)}`
        }
        return sheet;
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