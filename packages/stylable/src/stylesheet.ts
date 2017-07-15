import { Import } from './import';
import { Pojo, CSSObject, CSSRulesObject } from './types';
import { SBTypesParsers, valueMapping, MixinValue, TypedClass } from "./stylable-value-parsers";
import { hasOwn, objectifyCSS } from './parser';
import { parseSelector, PseudoSelectorAstNode, createSimpleSelectorChecker, traverseNode } from "./selector-utils";

const mixMixin = SBTypesParsers[valueMapping.mixin];

export class Stylesheet {
    cssDefinition: CSSObject;
    namespace: string;
    classes: Pojo<string>;
    typedClasses: Pojo<TypedClass>;
    mixinSelectors: Pojo<MixinValue[]>;
    resolvedSymbols: Pojo<any>;
    vars: Pojo<string>;
    imports: Import[];
    root: string;
    source: string;
    _kind = "Stylesheet";
    static globalCounter: number = 0;
    constructor(cssDefinition: CSSObject, namespace: string = "", source: string = "") {
        this.source = source;
        this.cssDefinition = cssDefinition;
        this.root = 'root';
        this.classes = {};
        this.typedClasses = {};
        this.vars = {};
        this.mixinSelectors = {};
        this.imports = [];
        this.namespace = this.getNamespace(namespace, cssDefinition['@namespace']);
        this.process();
    }
    static fromCSS(css: string, namespace?: string, source?: string) {
        return new this(objectifyCSS(css), namespace, source);
    }
    static isStylesheet(maybeStylesheet: any) {
        return maybeStylesheet instanceof Stylesheet;
    }
    /******** can be moved to own class *********/
    private process() {
        for (const selector in this.cssDefinition) {
            this.processDefinition(selector, this.cssDefinition[selector]);
        }
        if(!this.typedClasses[this.root]){
            this.classes.root = this.root;
            this.typedClasses.root = { [valueMapping.root]: true };
        }
    }
    private processDefinition(selector: string, rules: CSSRulesObject) {
        const ast = parseSelector(selector);
        const checker = createSimpleSelectorChecker();
        let isSimpleSelector = true;
        this.addMixins(selector, rules);
        traverseNode(ast, (node) => {
            if (!checker(node)) { isSimpleSelector = false; }
            const { type, name } = node;
            if (type === "pseudo-class") {
                if (name === 'import') {
                    const { content } = <PseudoSelectorAstNode>node;
                    this.imports.push(Import.fromImportObject(content, rules));
                } else if (name === 'vars') {
                    this.vars = rules;
                }
            } else if (type === 'class') {
                this.classes[node.name] = node.name;
            } else if (type === 'nested-pseudo-class') {
                if (name === 'global') {
                    return true;
                }
            }
            return undefined;
        });
        this.addTypedClasses(selector, rules, isSimpleSelector);
    }
    private addTypedClasses(selector: string, rules: CSSRulesObject, isSimpleSelector: boolean) {
        this.addTypedClass(selector, rules, isSimpleSelector, valueMapping.root);
        this.addTypedClass(selector, rules, isSimpleSelector, valueMapping.states);
        this.addTypedClass(selector, rules, isSimpleSelector, valueMapping.type);
    }
    private addTypedClass(selector: string, rules: CSSRulesObject, isSimpleSelector: boolean, rule: keyof typeof SBTypesParsers) {
        if (hasOwn(rules, rule)) {
            if (!isSimpleSelector) {
                throw new Error(rule + ' on complex selector: ' + selector);
            }
            const name = selector.replace('.', '');
            this.typedClasses[name] = {
                ...this.typedClasses[name],
                [rule]: SBTypesParsers[rule](rules[rule])
            };
        }
    }
    private addMixins(selector: string, rules: CSSRulesObject) {
        let mixin: string | string[] = rules[valueMapping.mixin];
        if (mixin && !Array.isArray(mixin)) { mixin = [mixin]; }
        if (mixin) {
            this.mixinSelectors[selector] = mixMixin(mixin[mixin.length - 1]);
        }
    }
    private getNamespace(strongNamespace = "", weakNamespace: string | string[] = "") {
        if (strongNamespace) { return strongNamespace.replace(/'|"/g, ''); }
        if (Array.isArray(weakNamespace)) {
            return weakNamespace[weakNamespace.length - 1].replace(/'|"/g, '');
        } else if (weakNamespace) {
            return weakNamespace.replace(/'|"/g, '');
        } else {
            return 's' + Stylesheet.globalCounter++;
        }
    }
    /********************************************/

    public get(name: string) {
        return this.classes[name] || null;
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

