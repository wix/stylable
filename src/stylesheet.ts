import { Import } from './import';
import { Pojo } from './index.d';
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
    SbRoot: boolean;
    SbStates: string[];
    SbType: string;
}

export class Stylesheet {
    cssDefinition: any;
    namespace: string;
    classes: Pojo<string>;
    typedClasses: Pojo<TypedClass>;
    imports: Import[];
    root: string;
    constructor(cssDefinition: any, namespace: string = "") {
        this.cssDefinition = cssDefinition;
        this.namespace = namespace;
        this.classes = {};
        this.typedClasses = {};
        this.imports = [];
        this.root = 'root';
        this.process();
    }
    static fromCSS(css: string, namespace?: string) {
        return new this(objectifyCSS(css), namespace);
    }
    private process() {
        Object.keys(this.cssDefinition).forEach((selector: string) => {
            const ast = parseSelector(selector);
            const checker = createSimpleSelectorChecker();
            let isSimpleSelector = true;
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
        this.addTypedClass(selector, isSimpleSelector, 'SbRoot');
        this.addTypedClass(selector, isSimpleSelector, 'SbStates');
        this.addTypedClass(selector, isSimpleSelector, 'SbType');
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
    private getImportForSymbol(symbol: string) {
        return this.imports.filter((_import) => _import.containsSymbol(symbol))[0] || null;
    }
    generateStateAttribute(stateName: string){
        return `data-${this.namespace.toLowerCase()}-${stateName.toLowerCase()}`;
    }
    cssStates(stateMapping?: Pojo<boolean>) {
        return stateMapping ? Object.keys(stateMapping).reduce((states: Pojo<boolean>, key) => {
            if (stateMapping[key]) { states[this.generateStateAttribute(key)] = true; }
            return states;
        }, {}) : {};
    }
    resolve(resolver: Resolver, name: string) {
        const typedClass = this.typedClasses[name];
        const _import = typedClass ? this.getImportForSymbol(typedClass.SbType) : null;
        return  _import ? resolver.resolveModule(_import.SbFrom) : this;
    }
}

