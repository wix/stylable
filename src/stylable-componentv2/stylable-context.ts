import { Generator, Resolver, Stylesheet, Config } from '../index';

export class StylableContext {
    sheets: Stylesheet[] = [];
    style: any = null;
    public generator: Generator;
    public resolver: Resolver;
    constructor(config: Partial<Config>) { 
        this.resolver = new Resolver({});
        this.generator = new Generator({...config, resolver: this.resolver});
    }
    add(sheet: Stylesheet) {
        this.resolver.add(sheet.namespace, sheet);
        if(sheet.source){
            this.resolver.add(sheet.source, sheet);
        }
        this.sheets.push(sheet);
    }
    registerMixin(name: string, mixin: Function) {
        this.resolver.add(name, mixin);
    }
    attach() {
        const style = this.style || (this.style = document.createElement('style'));
        Generator.generate(this.sheets, this.generator).forEach((css) => {
            style.appendChild(document.createTextNode(css));
        });
        document.head.appendChild(this.style);
    }
}