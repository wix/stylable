import { PartialObject, Pojo } from './types';
import { parseSelector, SelectorAstNode, stringifyCSSObject, stringifySelector, traverseNode } from './parser';
import { Resolver } from './resolver';
import { Stylesheet, TypedClass } from './stylesheet';
const cssflat = require('../modules/flat-css');

export interface ExtendedSelector {
    selector: string,
    rules: Pojo<string>
}

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
    static generate(styles: Stylesheet | Stylesheet[], generator: Generator = new Generator({})) {
        if (!Array.isArray(styles)) { styles = [styles]; }
        styles.forEach((style) => generator.addEntry(style));
        return generator.buffer;
    }
    addEntry(sheet: Stylesheet) {
        //prevent duplicates
        if (!this.generated.has(sheet)) {
            this.generated.add(sheet);
            const resolvedSymbols = sheet.resolveImports(this.config.resolver);
            this.addImports(resolvedSymbols);
            this.addSelectors(sheet, resolvedSymbols);
        }
    }
    //TODO: replace Pojo with "ModuleMap"
    addImports(resolvedSymbols: Pojo) {
        for (const symbol in resolvedSymbols) {
            const exportValue = resolvedSymbols[symbol];
            if (exportValue instanceof Stylesheet) {
                this.addEntry(exportValue);
            }
        }
    }
    prepareSelector(sheet: Stylesheet, selector: string | ExtendedSelector, resolvedSymbols: Pojo, stack: Array<string | ExtendedSelector> = []) {
        let rules: Pojo, aSelector: string;
        if (typeof selector === 'string') {
            rules = sheet.cssDefinition[selector];
            aSelector = selector;
            const mixins = sheet.mixinSelectors[aSelector];
            if (mixins) {
                rules = { ...rules };
                mixins.forEach((mixin) => {
                    const mixinFunction = resolvedSymbols[mixin.type];
                    const cssMixin = cssflat({
                        [aSelector]: {
                            ...rules,
                            ...mixinFunction(mixin.options.map((option: string) => valueTemplate(option, sheet.vars)))
                        }
                    });
                    for (var key in cssMixin) {
                        stack.push({ selector: key, rules: cssMixin[key] });
                    }
                });
                return null;
            }
        } else {
            rules = selector.rules;
            aSelector = selector.selector;
        }

        if (selector === '@namespace') { return null; }
        if (selector === ':vars') { return null; }
        //don't emit empty selectors in production
        if (this.config.mode === Mode.PROD && !hasKeys(rules)) { return null; }

        const ast = parseSelector(aSelector);

        //don't emit imports
        if (isImport(ast)) { return null; }

        const processedRules: Pojo<string> = {};
        for (var k in rules) {
            let value = Array.isArray(rules[k]) ? rules[k][rules[k].length - 1] : rules[k];
            processedRules[k] = valueTemplate(value, sheet.vars);
        }

        return {
            [this.scopeSelector(sheet, aSelector, ast)]: processedRules
        };

    }
    addSelectors(sheet: Stylesheet, resolvedSymbols: Pojo) {
        const stack = Object.keys(sheet.cssDefinition).reverse();
        while (stack.length) {
            const selector = stack.pop()!;
            const selectorObject = this.prepareSelector(sheet, selector, resolvedSymbols, stack);
            if (!selectorObject) { continue; }
            this.buffer.push(stringifyCSSObject(selectorObject));
        }
    }
    scopeSelector(sheet: Stylesheet, selector: string, ast: SelectorAstNode): string {
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
                node.content = current.stateAttr(name);
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
    return typedClass && typedClass['-sb-states'] && typedClass['-sb-states'].indexOf(name) !== -1;
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

function valueTemplate(value: string, data: Pojo, throwCondition = 0): string {
    return value.replace(/value\((.*?)\)/g, function (match: string, name: string) {
        if(throwCondition > 1){throw new Error('Unresolvable variable: ' + name)}
        const res = valueTemplate(data[name], data, throwCondition + 1);
        return res !== undefined ? res : match;
    });
}