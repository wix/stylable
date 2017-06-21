import { Pojo } from './index.d';
import {
    createSimpleSelectorChecker,
    hasOwn,
    objectifyCSS,
    parseSelector,
    PseudoSelectorAstNode,
    traverseNode,
} from './parser';

const postjs = require("postcss-js");
const postcss = require("postcss");

const processor = postcss()

export interface TypedClass {
    SbRoot: boolean;
}

export class InMemoryContext {
    constructor(public buffer: string[] = []) { }
}


export interface CSSImportRaw {
    SbDefault: string;
    SbNamed: string;
    [key: string]: string;
}

export class Import {
    static fromRawCSS(SbFrom: string, cssImportDef: CSSImportRaw){
        
        const namedMap: Pojo<string> = {};

        if(cssImportDef["SbNamed"]) {
            cssImportDef["SbNamed"].split(',').forEach((name)=>{
                const parts = name.trim().split(/\s+as\s+/);
                if(parts.length === 1){
                    namedMap[parts[0]] = parts[0];
                } else if(parts.length === 2){
                    namedMap[parts[0]] = parts[1];
                }
            })
        }

        for(var key in cssImportDef){
            const match = key.match(/^SbNamed(.+)/);
            if(match){
                namedMap[match[1]] = cssImportDef[key];
            }
        }
        
        return new Import(SbFrom.slice(1, -1), cssImportDef.SbDefault, namedMap);   
    }
    constructor(public SbFrom: string, public SbDefault: string = "", public SbNamed: Pojo<string> = {}){}
}
                 
export class Stylesheet {
    cssDefinition: any;
    classes: Pojo<string>;
    typedClasses: Pojo<TypedClass>;
    imports: Import[];
    constructor(cssDefinition: any) {
        this.cssDefinition = cssDefinition;
        this.classes = {};
        this.typedClasses = {};
        this.imports = [];
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
            const checker = createSimpleSelectorChecker();
            let isSimpleSelector = true;
            traverseNode(ast, (node) => {
                if(!checker(node)){ isSimpleSelector = false; }
                const { type, name } = node;
                if(type === "pseudo-class" && name === 'import'){
                    const {content} = node as PseudoSelectorAstNode;
                    this.imports.push(Import.fromRawCSS(content || this.cssDefinition[selector]['SbFrom'], this.cssDefinition[selector]));
                } else if (node.type === 'class') {
                    this.addClassNameMapping(node.name);
                }
            });            
            this.addTypedClass(selector, isSimpleSelector);
        });
    }
    private addTypedClass(selector: string, isSimpleSelector: boolean) {
        const rules: Pojo<string> = this.cssDefinition[selector];
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









