import { PartialObject, Pojo } from './types';
import { parseSelector, SelectorAstNode, stringifyCSSObject, stringifySelector, traverseNode } from './parser';
import { Resolver } from './resolver';
import { Stylesheet, TypedClass } from './stylesheet';

export enum Mode {
    DEV,
    PROD
}

export const DEFAULT_CONFIG = {
    namespaceDivider: "💠",
    resolver: new Resolver({}),
    mode: Mode.DEV
};

export declare type Config = typeof DEFAULT_CONFIG

export class Generator {
    private config: Config;
    private generated: Set<Stylesheet>;
    constructor(config: PartialObject<Config>, public buffer: string[] = []) {
        this.config = {
            namespaceDivider: config.namespaceDivider || DEFAULT_CONFIG.namespaceDivider,
            resolver: config.resolver || DEFAULT_CONFIG.resolver,
            mode: config.mode || DEFAULT_CONFIG.mode
        };
        this.generated = new Set();
    }
    addEntry(sheet: Stylesheet) {
        //prevent duplicates
        if (!this.generated.has(sheet)) {
            this.generated.add(sheet);
            this.addImports(sheet);
            this.addSelectors(sheet);
        }
    }
    addImports(sheet: Stylesheet) {
        sheet.imports.forEach((importDef) => {
            const resolved = this.config.resolver.resolveModule(importDef.SbFrom);
            resolved && this.addEntry(resolved);
        });
    }
    addSelectors(sheet: Stylesheet) {
        for (const selector in sheet.cssDefinition) {
            const rules = sheet.cssDefinition[selector];
            if (this.config.mode === Mode.PROD && !hasKeys(rules)) {
                continue;
            }
            const ast = parseSelector(selector);
            if (isImport(ast)) { continue; }
            this.buffer.push(stringifyCSSObject({
                [this.scopeSelector(sheet, selector, ast)]: rules
            }));
        }
    }
    scopeSelector(sheet: Stylesheet, selector: string, ast: SelectorAstNode) {
        let current = sheet;
        let typedClass: string;
        let element: string;

        traverseNode(ast, (node) => {
            const { name, type } = node;
            if (type === 'selector') {
                current = sheet;
                typedClass = sheet.root;
            } else if (type === 'class') {
                typedClass = name;
                current = this.handleClass(current, node, name);
            } else if (type === 'element') {
                current = this.handleElement(current, node, name);
            } else if (type === 'pseudo-element') {
                element = name;
                current = this.handlePseudoElement(current, node, name);
            } else if (type === 'pseudo-class') {
                current = this.handlePseudoClass(current, node, name, sheet, typedClass, element);
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
        }
        return next;
    }
    handlePseudoElement(sheet: Stylesheet, node: SelectorAstNode, name: string) {
        //TODO: only transform what is found
        if (sheet.classes[name]) {
            node.type = 'class';
            node.before = ' ';
            node.name = this.scope(name, sheet.namespace);
        }
        return sheet.resolve(this.config.resolver, name);
    }
    handlePseudoClass(sheet: Stylesheet, node: SelectorAstNode, name: string, sheetOrigin: Stylesheet, typedClassName: string, element: string) {
        let current = element ? sheet : sheetOrigin;
        let localName = element ? element : typedClassName;
        while (current) {
            const typedClass = current.typedClasses[localName];
            if (hasState(typedClass, name)) {
                node.type = 'attribute';
                node.content = current.generateStateAttribute(name);
                break;
            }
            const next = current.resolve(this.config.resolver, localName);
            if (next !== current) {
                current = next;
                localName = current.root;
            } else {
                break;
            }
        }
        return sheet;
    }
    scope(name: string, namespace: string, separator: string = this.config.namespaceDivider) {
        return namespace ? namespace + separator + name : name;
    }
}

function hasState(typedClass: TypedClass, name: string) {
    return typedClass && typedClass.SbStates && typedClass.SbStates.indexOf(name) !== -1;
}

function isImport(ast: SelectorAstNode): boolean {
    const selectors = ast.nodes[0];
    const selector = selectors && selectors.nodes[0];
    return selector && selector.type === "pseudo-class" && selector.name === 'import';
}

function hasKeys(o: Pojo<any>) {
    for (var k in o) {
        if (o.hasOwnProperty(k)) {
            return true;
        }
    }
    return false;
}