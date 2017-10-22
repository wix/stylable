namespace Stylable {
    export interface StateMap {
        [key: string]: boolean
    }

    export interface Stylesheet {
        namespace: string;
        root: string;
        get: (localName: string) => string;
        cssStates: (stateMapping: StateMap) => StateMap;
    }

    export type RuntimeStylesheet = {[key: string]: string} & {$stylesheet: Stylesheet};

    export type Pojo<T = any> = {[key: string]: T} & object;
    export type PartialObject<T> = Partial<T> & object;
    export type CSSObject = any & object;
}
