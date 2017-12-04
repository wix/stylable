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
}
export declare type StylesheetLocals = {
    [key: string]: string;
} & {
    $stylesheet: Stylesheet;
} & RuntimeHelpers;
export declare type RuntimeStylesheet = StylesheetLocals & ((className: string, states?: StateMap | null, props?: PartialProps) => {
    [key: string]: string;
});
export interface PartialProps {
    className?: string;
    [key: string]: any;
}
export declare type Pojo<T = any> = {
    [key: string]: T;
} & object;
export declare type PartialObject<T> = Partial<T> & object;
export declare type CSSObject = any & object;
export declare type stColor<min extends number | null = null, max extends number | null = null> = string;
export declare type stSize<unit extends string, min extends number | null = null, max extends number | null = null, mults extends number | null = null> = string;
export declare type stPercent<min extends number | null = null, max extends number | null = null, mults extends number | null = null> = string;
export declare type stString = string;
export declare type stNumber<min extends number | null = null, max extends number | null = null, mults extends number | null = null> = string;
export declare type stImage = string;
export declare type stCssFrag = string;
