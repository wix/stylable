import { Stylesheet, Generator, Resolver } from '../index';

export declare type StylesheetWithContext = typeof Stylesheet & { context: StylableContext };
export declare type Pojo<T> = { [key: string]: T };

export class StylableContext {
    static globalSheetCounter = 0;
    sheets: Stylesheet[] = [];
    style: any = null;
    constructor(public generator: Generator) { }
    add(sheet: Stylesheet) {
        (this.generator as any).config.resolver.zMap[sheet.namespace] = sheet;
        this.sheets.push(sheet);
    }
    attach(theme?: Pojo<string>) {
        const style = this.style || (this.style = document.createElement('style'));
        Generator.generate(this.sheets, this.generator).forEach((css) => {
            style.appendChild(document.createTextNode(css));
        });
        document.head.appendChild(this.style);
    }
}

export function createStyleableStylesheet(config?: object): StylesheetWithContext {

    const generator = new Generator({ namespaceDivider: "▪", resolver: new Resolver({}) });

    return class StylableStylesheet extends Stylesheet {
        static context = new StylableContext(generator);
        _kind = "Stylesheet";
        get(name: string) {
            const n = this.classes[name];
            return n ? generator.scope(name, this.namespace) : null;
        }
        constructor(public styleDef: any) {
            super(styleDef);
            this.namespace = 's' + (StylableContext.globalSheetCounter++);
            StylableStylesheet.context.add(this);
        }
    }
}
