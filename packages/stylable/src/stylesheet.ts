import { Pojo } from "./index.d";
const postjs = require("postcss-js");
const postcss = require("postcss");

const processor = postcss()

export interface TypedClass {
    SbRoot: boolean
}

export interface Meta {
    cssDefinition: any;
    typedClasses: Pojo<TypedClass>;
    classes: Pojo<string>;
}


export class InMemoryContext {
    constructor(public buffer: string[] = []) { }
}


export class Stylesheet {
    classes: Pojo<string>;
    constructor(public meta: Partial<Meta>) {
        this.classes = meta.classes || {};
    }
    generate(ctx: InMemoryContext) {
        this.meta.cssDefinition && Object.keys(this.meta.cssDefinition).forEach((selector) => {
            if (Object.keys(this.meta.cssDefinition[selector]).length) {
                var result = processor.process({ [selector]: this.meta.cssDefinition[selector] }, { parser: postjs });
                result.css && ctx.buffer.push(result.css);
            }
        });
    }
    
}




// css in js









