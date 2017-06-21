import { Pojo } from './index.d';
import { hasOwn, parseSelector, objectifyCSS, isOnlyElementOrClassSelector, SelectorAstNode, traverseNode } from './parser';

const postjs = require("postcss-js");
const postcss = require("postcss");

const processor = postcss()

export interface TypedClass {
    SbRoot: boolean;
}

export class InMemoryContext {
    constructor(public buffer: string[] = []) { }
}


export class Stylesheet {
    cssDefinition: any;
    classes: Pojo<string>;
    typedClasses: Pojo<TypedClass>;
    constructor(cssDefinition: any) {
        this.cssDefinition = cssDefinition;
        this.classes = {};
        this.typedClasses = {};
        this.process();
    }
    static fromCSS(css: string) {
        return new Stylesheet(objectifyCSS(css));
    }
    generate(ctx: InMemoryContext) {
        Object.keys(this.cssDefinition).forEach((selector) => {
            if (Object.keys(this.cssDefinition[selector]).length) {
                var result = processor.process({ [selector]: this.cssDefinition[selector] }, { parser: postjs });
                result.css && ctx.buffer.push(result.css);
            }
        });
    }
    private process() {
        Object.keys(this.cssDefinition).forEach((selector: string) => {
            const ast = parseSelector(selector);
            this.addTypedClass(selector, ast);
            traverseNode(ast, (node) => {
                if (node.type === 'class') {
                    this.addClassNameMapping(node.name);
                }
            });
        });
    }
    private addTypedClass(selector: string, ast: SelectorAstNode) {
        const rules: Pojo<string> = this.cssDefinition[selector];
        const isSimpleSelector = isOnlyElementOrClassSelector(ast);
        const name = selector.replace('.', '');
        if (hasOwn(rules, 'SbRoot')) {
            if (isSimpleSelector) {
                this.typedClasses[name] = {
                    SbRoot: rules['SbRoot'] === 'false' ? false : true
                };
            } else {
                throw new Error('-sb-root on complex selector: ' + selector);
            }
        }
    }

    private addClassNameMapping(originalName: string, mappedName: string = originalName) {
        this.classes[originalName] = mappedName;
    }
}



// css in js









