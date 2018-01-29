export interface StateMap {
    [key: string]: string | number | boolean;
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

export interface ParsedValue {
    type: string;
    value: string;
    nodes?: any;
    resolvedValue?: string;
}

export interface StateTypeValidator {
    name: keyof StringValidators | keyof NumberValidators;
    args: string[];
}

export interface StringValidators {
    contains: string;
    minLength: string;
    maxLength: string;
}

export interface NumberValidators {
    min: string;
    max: string;
    multipleOf: string;
}

export interface StateTypes {
    string: StringValidators;
    number: NumberValidators;
}

export interface StateParsedValue {
    type: keyof StateTypes;
    defaultValue?: string;
    validators: StateTypeValidator[];
}

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
