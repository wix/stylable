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
    constructor(cssDefinition: any, namespace: string = "") {
        this.cssDefinition = cssDefinition;
        this.namespace = namespace;
        this.classes = {};
        this.typedClasses = {};
        this.imports = [];
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
                    const { content } = node as PseudoSelectorAstNode;
                    this.imports.push(Import.fromImportObject(content, this.cssDefinition[selector]));
                } else if (type === 'class') {
                    this.addClassNameMapping(node.name);
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
    private addClassNameMapping(originalName: string, mappedName: string = originalName) {
        this.classes[originalName] = mappedName;
    }
}

