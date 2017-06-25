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
        this.root = namespace;
        this.process();
    }
    static fromCSS(css: string, namespace?: string) {
        return new Stylesheet(objectifyCSS(css), namespace);
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

            if (isSimpleSelector) {
                const name = selector.replace('.', '');
                this.typedClasses[name] = {
                    ...this.typedClasses[name],
                    [rule]: SBTypesParsers[rule](rules[rule])
                };
            } else {
                throw new Error(kebab(rule) + ' on complex selector: ' + selector);
            }
            delete rules[rule];
        }
    }
    private getImportForSymbol(symbol: string) {
        return this.imports.filter((_import) => _import.containsSymbol(symbol))[0] || null;
    }
    resolve(resolver: any, name: string) {
        const typedClass = this.typedClasses[name];
        const _import = typedClass ? this.getImportForSymbol(typedClass.SbType) : null;
        return  _import ? resolver.resolve(_import.SbFrom) : this;
    }
}

