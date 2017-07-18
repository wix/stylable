import { Import } from './import';
import { Pojo, CSSObject } from './types';
import { MixinValue, TypedClass } from "./stylable-value-parsers";
import { objectifyCSS } from './parser';
import { process } from "./process";

export class Stylesheet {
    namespace: string;
    root: string = 'root';
    source: string;
    cssDefinition: CSSObject;
    imports: Import[] = [];
    classes: Pojo<string> = {};
    vars: Pojo<string> = {};
    mixinSelectors: Pojo<MixinValue[]> = {};
    typedClasses: Pojo<TypedClass> = {};
    keyframes: string[] = [];
    _kind = "Stylesheet";
    static globalCounter: number = 0;
    constructor(cssDefinition: CSSObject, namespace: string = "", source: string = "") {
        this.source = source;
        this.cssDefinition = cssDefinition;
        this.namespace = this.processNamespace(namespace, cssDefinition['@namespace']);
        process(this);
    }
    static fromCSS(css: string, namespace?: string, source?: string) {
        return new this(objectifyCSS(css), namespace, source);
    }
    static isStylesheet(maybeStylesheet: any) {
        return maybeStylesheet instanceof Stylesheet;
    }
    private processNamespace(strongNamespace = "", weakNamespace: string | string[] = "") {
        if (strongNamespace) { return strongNamespace.replace(/'|"/g, ''); }
        if (Array.isArray(weakNamespace)) {
            return weakNamespace[weakNamespace.length - 1].replace(/'|"/g, '');
        } else if (weakNamespace) {
            return weakNamespace.replace(/'|"/g, '');
        } else {
            return 's' + Stylesheet.globalCounter++;
        }
    }
    public get(name: string) {
        return this.classes[name] || null;
    }
    public stateAttr(stateName: string) {
        return `data-${this.namespace.toLowerCase()}-${stateName.toLowerCase()}`;
    }
    public cssStates(stateMapping?: Pojo<boolean>) {
        return stateMapping ? Object.keys(stateMapping).reduce((states: Pojo<boolean>, key) => {
            if (stateMapping[key]) { states[this.stateAttr(key)] = true; }
            return states;
        }, {}) : {};
    }

}

