import { Import } from './import';
import { Pojo, CSSObject, CSSRulesObject } from './types';
import { SBTypesParsers, valueMapping, MixinValue, TypedClass } from "./stylable-value-parsers";
import { hasOwn, objectifyCSS } from './parser';
import { parseSelector, PseudoSelectorAstNode, createSimpleSelectorChecker, traverseNode } from "./selector-utils";

const mixMixin = SBTypesParsers[valueMapping.mixin];

export class Stylesheet {
    namespace: string;
    root: string = 'root';
    source: string;
    cssDefinition: CSSObject;
    imports: Import[] = [];
    classes: Pojo<string> = {};
    vars: Pojo<string> = {};
    mixinSelectors: Pojo<MixinValue[]> = {};
    typedClasses: Pojo<TypedClass> = {};
    _kind = "Stylesheet";
    static globalCounter: number = 0;
    constructor(cssDefinition: CSSObject, namespace: string = "", source: string = "") {
        this.source = source;
        this.cssDefinition = cssDefinition;
        this.namespace = this.processNamespace(namespace, cssDefinition['@namespace']);
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
        if (!this.typedClasses[this.root]) {
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
    private processNamespace(strongNamespace = "", weakNamespace: string | string[] = "") {
        if (strongNamespace) { return strongNamespace.replace(/'|"/g, ''); }
        if (Array.isArray(weakNamespace)) {
            return weakNamespace[weakNamespace.length - 1].replace(/'|"/g, '');
        } else if (weakNamespace) {
            return weakNamespace.replace(/'|"/g, '');
        } else {
            return 's' + Stylesheet.globalCounter++;
        }
    }
    private addTypedClasses(selector: string, rules: CSSRulesObject, isSimpleSelector: boolean) {
        this.addTypedClass(selector, rules, isSimpleSelector, valueMapping.root);
        this.addTypedClass(selector, rules, isSimpleSelector, valueMapping.states);
        this.addTypedClass(selector, rules, isSimpleSelector, valueMapping.type);
    }
    private addTypedClass(selector: string, rules: CSSRulesObject, isSimpleSelector: boolean, typedRule: keyof typeof SBTypesParsers) {
        if (!hasOwn(rules, typedRule)) { return; }
        if (!isSimpleSelector) { throw new Error(typedRule + ' on complex selector: ' + selector); }
        const name = selector.replace('.', '');
        this.typedClasses[name] = {
            ...this.typedClasses[name],
            [typedRule]: SBTypesParsers[typedRule](rules[typedRule])
        };
    }
    private addMixins(selector: string, rules: CSSRulesObject) {
        let mixin: string | string[] = rules[valueMapping.mixin];
        if (mixin && !Array.isArray(mixin)) { mixin = [mixin]; }
        if (mixin) {
            this.mixinSelectors[selector] = mixMixin(mixin[mixin.length - 1]);
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

