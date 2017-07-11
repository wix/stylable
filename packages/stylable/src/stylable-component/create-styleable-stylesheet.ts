import { Stylesheet, Generator, Resolver, Config } from '../index';

export declare type StylesheetWithContext = typeof Stylesheet & { context: StylableContext };
export declare type Pojo<T = {}> = { [key: string]: T };

export class StylableContext {
    static globalSheetCounter = 0;
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
    attach(theme?: Pojo<string>) {
        const style = this.style || (this.style = document.createElement('style'));
        Generator.generate(this.sheets, this.generator).forEach((css) => {
            style.appendChild(document.createTextNode(css));
        });
        style.$theme = theme;
        document.head.appendChild(this.style);
    }
}

export function createStyleableStylesheet(): StylesheetWithContext {

    return class StylableStylesheet extends Stylesheet {
        static context = new StylableContext({ namespaceDivider: "▪" });
        constructor(public styleDef: any, namespace: string, source?: string) {
            super(styleDef, namespace, source);
            this.namespace = this.namespace || ('s' + (StylableContext.globalSheetCounter++));
            StylableStylesheet.context.add(this);
        }
    }
}
