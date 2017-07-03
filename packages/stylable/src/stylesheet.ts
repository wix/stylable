import { Import } from './import';
import { Pojo, CSSObject } from './types';
import {
    createSimpleSelectorChecker,
    hasOwn,
    objectifyCSS,
    parseSelector,
    PseudoSelectorAstNode,
    SBTypesParsers,
    traverseNode,
} from './parser';
import { Resolver } from './resolver';

const kebab = require("kebab-case");

export interface TypedClass {
    "-sb-root": boolean;
    "-sb-states": string[];
    "-sb-type": string;
}

export interface Mixin {
    type: string;
    options: Pojo;
}

export class Stylesheet {
    cssDefinition: CSSObject;
    namespace: string;
    classes: Pojo<string>;
    typedClasses: Pojo<TypedClass>;
    mixinSelectors: Pojo<Mixin[]>;
    resolvedSymbols: Pojo<any>;
    imports: Import[];
    root: string;
    constructor(cssDefinition: CSSObject, namespace: string = "") {
        this.cssDefinition = cssDefinition;
        this.namespace = namespace;
        this.classes = {};
        this.typedClasses = {};
        this.mixinSelectors = {};
        this.imports = [];
        this.root = 'root';
        this.process();
    }
    static fromCSS(css: string, namespace?: string) {
        return new this(objectifyCSS(css), namespace);
    }
    /******** can be moved to own class *********/
    private process() {
        Object.keys(this.cssDefinition).forEach((selector: string) => {
            const ast = parseSelector(selector);
            const checker = createSimpleSelectorChecker();
            let isSimpleSelector = true;
            this.addMixins(selector);
            traverseNode(ast, (node) => {
                if (!checker(node)) { isSimpleSelector = false; }
                const { type, name } = node;
                if (type === "pseudo-class" && name === 'import') {
                    const { content } = <PseudoSelectorAstNode>node;
                    this.imports.push(Import.fromImportObject(content, this.cssDefinition[selector]));
                } else if (type === 'class') {
                    this.classes[node.name] = node.name;
                }
            });
            this.addTypedClasses(selector, isSimpleSelector);
        });
    }
    private addTypedClasses(selector: string, isSimpleSelector: boolean) {
        this.addTypedClass(selector, isSimpleSelector, '-sb-root');
        this.addTypedClass(selector, isSimpleSelector, '-sb-states');
        this.addTypedClass(selector, isSimpleSelector, '-sb-type');
    }
    private addTypedClass(selector: string, isSimpleSelector: boolean, rule: keyof typeof SBTypesParsers) {
        const rules: Pojo<string> = this.cssDefinition[selector];
        if (hasOwn(rules, rule)) {
            if (!isSimpleSelector) {
                throw new Error(kebab(rule) + ' on complex selector: ' + selector);
            }
            const name = selector.replace('.', '');
            this.typedClasses[name] = {
                ...this.typedClasses[name],
                [rule]: SBTypesParsers[rule](rules[rule])
            };
            delete rules[rule];
        }
    }
    private addMixins(selector: string) {
        const rules: Pojo<string> = this.cssDefinition[selector];
        const bucket = this.mixinSelectors[selector] || [];
        const map = Object.create(null);

        for (var rule in rules) {
            const match = rule.match('-sb-mixin-(.*?)-(.*)');
            if (match) {
                const type = match[1];
                const option = match[2];
                map[type] = map[type] || {};
                map[type][option] = rules[rule];
                delete rules[rule];
            }
        }

        for (const type in map) {
            bucket.push({ type, options: map[type] });
        }

        if (bucket.length) {
            this.mixinSelectors[selector] = bucket;
        }

    }
    /********************************************/

    getImportForSymbol(symbol: string) {
        return this.imports.filter((_import) => _import.containsSymbol(symbol))[0] || null;
    }
    resolveImports(resolver: Resolver) {
        //TODO: add support __esModule support?
        return this.imports.reduce((acc, importDef) => {
            const m = resolver.resolveModule(importDef.from);
            acc[importDef.defaultExport || importDef.from] = m.default || m;
            for (const name in importDef.named) {
                acc[name] = m[name];
            }
            return acc;
        }, {} as Pojo);
    }
    resolve(resolver: Resolver, name: string) {
        const typedClass = this.typedClasses[name];
        const _import = typedClass ? this.getImportForSymbol(typedClass['-sb-type']) : null;
        return _import ? resolver.resolveModule(_import.from) : this;
    }

    public stateAttr(stateName: string) {
        return `data-${this.namespace.toLowerCase()}-${stateName.toLowerCase()}`;
    }

    public cssStates(stateMapping?: Pojo<boolean>) {
        return stateMapping ? Object.keys(stateMapping).reduce((states: Pojo<boolean>, key) => {
            if (stateMapping[key]) { states[this.stateAttr(key)] = true; }
            return states;
        }, {}) : {};
    }

}

