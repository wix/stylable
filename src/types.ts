export interface StateMap {
    [key: string]: boolean;
}

export interface Stylesheet {
    namespace: string;
    root: string;
    get: (localName: string) => string;
    cssStates: (stateMapping: StateMap) => StateMap;
}

export interface RuntimeHelpers {
    $get: (localName: string) => string;
    $cssStates: (stateMapping?: StateMap | null) => StateMap;
    $mapClasses: (classNameString: string) => string;
}

export type StylesheetLocals = {[key: string]: string} & {$stylesheet: Stylesheet} & RuntimeHelpers;
export type RuntimeStylesheet = StylesheetLocals & (
    (
        className: string,
        states?: StateMap | null,
        props?: {className?: string, [key: string]: any}
    ) => {[key: string]: string}
);

export type Pojo<T = any> = {[key: string]: T} & object;
export type PartialObject<T> = Partial<T> & object;
export type CSSObject = any & object;
