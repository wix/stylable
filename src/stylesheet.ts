import { Import } from './import';
import { Pojo, CSSObject } from './types';
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
        this.classes = { root: this.root };
        this.typedClasses = { root: { [valueMapping.root]: true } };
        this.vars = {};
        this.mixinSelectors = {};
        this.imports = [];
        this.namespace = this.getNamespace(namespace);
        this.process();
    }
    static fromCSS(css: string, namespace?: string, source?: string) {
        return new this(objectifyCSS(css), namespace, source);
    }
    static isStylesheet(maybeStylesheet: any) {
        return maybeStylesheet instanceof Stylesheet;
    }
    private getNamespace(strongNamespace = "") {
        if (strongNamespace) { return strongNamespace.replace(/'|"/g, ''); }
        const value = this.cssDefinition["@namespace"];
        if (Array.isArray(value)) {
            return value[value.length - 1].replace(/'|"/g, '');
        } else if (value) {
            return value.replace(/'|"/g, '');
        } else {
            //TODO: maybe auto generate here.
            return 's' + Stylesheet.globalCounter++;
        }
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
                if (type === "pseudo-class") {
                    if (name === 'import') {
                        const { content } = <PseudoSelectorAstNode>node;
                        this.imports.push(Import.fromImportObject(content, this.cssDefinition[selector]));
                    } else if (name === 'vars') {
                        this.vars = this.cssDefinition[selector];
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
            this.addTypedClasses(selector, isSimpleSelector);
        });
    }
    private addTypedClasses(selector: string, isSimpleSelector: boolean) {
        this.addTypedClass(selector, isSimpleSelector, valueMapping.root);
        this.addTypedClass(selector, isSimpleSelector, valueMapping.states);
        this.addTypedClass(selector, isSimpleSelector, valueMapping.type);
    }
    private addTypedClass(selector: string, isSimpleSelector: boolean, rule: keyof typeof SBTypesParsers) {
        const rules: Pojo<string> = this.cssDefinition[selector];
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
    private addMixins(selector: string) {
        const rules: Pojo<string> = this.cssDefinition[selector];
        let mixin: string | string[] = rules[valueMapping.mixin];
        if (mixin && !Array.isArray(mixin)) { mixin = [mixin]; }

        if (mixin) {
            const last = mixin[mixin.length - 1];
            this.mixinSelectors[selector] = mixMixin(last);
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

