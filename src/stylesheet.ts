import { Pojo } from './index.d';
import {
    createSimpleSelectorChecker,
    hasOwn,
    objectifyCSS,
    parseSelector,
    PseudoSelectorAstNode,
    traverseNode,
} from './parser';
import { InMemoryContext } from "./in-memory-context";
const kebab = require("kebab-case");



export interface TypedClass {
    SbRoot: boolean;
    SbStates: string[];
    SbType: string;
}

export interface CSSImportRaw {
    SbDefault: string;
    SbNamed: string;
    [key: string]: string;
}


export class Import {
    static fromRawCSS(SbFrom: string, cssImportDef: CSSImportRaw) {
        SbFrom = SbFrom || cssImportDef['SbFrom'];
        const namedMap: Pojo<string> = {};

        if (cssImportDef["SbNamed"]) {
            cssImportDef["SbNamed"].split(',').forEach((name) => {
                const parts = name.trim().split(/\s+as\s+/);
                if (parts.length === 1) {
                    namedMap[parts[0]] = parts[0];
                } else if (parts.length === 2) {
                    namedMap[parts[0]] = parts[1];
                }
            })
        }

        for (var key in cssImportDef) {
            const match = key.match(/^SbNamed(.+)/);
            if (match) {
                namedMap[match[1]] = cssImportDef[key];
            }
        }

        return new Import(SbFrom.slice(1, -1), cssImportDef.SbDefault, namedMap);
    }
    constructor(public SbFrom: string, public SbDefault: string = "", public SbNamed: Pojo<string> = {}) { }
}

const SBTypesParsers = {
    SbRoot: (value: string) => {
        return value === 'false' ? false : true
    },
    SbStates: (value: string) => {
        return value ? value.split(',').map((state) => state.trim()) : [];
    },
    SbType: (value: string) => {
        return value ? value.trim() : "";
    }
}

export class Stylesheet {
    cssDefinition: any;
    classes: Pojo<string>;
    typedClasses: Pojo<TypedClass>;
    imports: Import[];
    namespace: string;
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
    generate(ctx: InMemoryContext) {
        Object.keys(this.cssDefinition).forEach((selector) => {
            if (Object.keys(this.cssDefinition[selector]).length) {
                ctx.add(selector, this.cssDefinition[selector], this.namespace);
            }
        });
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
                    this.imports.push(Import.fromRawCSS(content, this.cssDefinition[selector]));
                } else if (node.type === 'class') {
                    this.addClassNameMapping(node.name);
                }
            });
            this.addTypedClass(selector, isSimpleSelector);
        });
    }
    private addTypedClass(selector: string, isSimpleSelector: boolean) {
        this.addTypedRule(selector, isSimpleSelector, 'SbRoot');
        this.addTypedRule(selector, isSimpleSelector, 'SbStates');
        this.addTypedRule(selector, isSimpleSelector, 'SbType');
    }
    private addTypedRule(selector: string, isSimpleSelector: boolean, rule: keyof typeof SBTypesParsers) {
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
        }
    }
    private addClassNameMapping(originalName: string, mappedName: string = originalName) {
        this.classes[originalName] = mappedName;
    }
}



// css in js









