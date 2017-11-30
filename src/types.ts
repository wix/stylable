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

export type StylesheetLocals = { [key: string]: string } & { $stylesheet: Stylesheet } & RuntimeHelpers;
export type RuntimeStylesheet = StylesheetLocals & (
    (
        className: string,
        states?: StateMap | null,
        props?: PartialProps
    ) => { [key: string]: string }
);

export interface PartialProps {
    className?: string;
    [key: string]: any;
}

export type Pojo<T = any> = { [key: string]: T } & object;
export type PartialObject<T> = Partial<T> & object;
export type CSSObject = any & object;

export type stColor<min extends number | null = null, max extends number | null = null> = string;
export type stSize<
    unit extends string,
    min extends number | null = null,
    max extends number | null = null,
    mults extends number | null = null> = string;
export type stPercent<
    min extends number | null = null,
    max extends number | null = null,
    mults extends number | null = null> = string;
export type stString = string;
export type stNumber<
    min extends number | null = null,
    max extends number | null = null,
    mults extends number | null = null> = string;
export type stImage = string;
export type stCssFrag = string;
