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

export const cssNativeFunctionsDic = {
    'attr': true,
    'blur': true,
    'brightness': true,
    'calc': true,
    'circle': true,
    'contrast': true,
    'counter': true,
    'counters': true,
    'cubic-bezier': true,
    'drop-shadow': true,
    'ellipse': true,
    'grayscale': true,
    'hsl': true,
    'hsla': true,
    'hue-rotate': true,
    'hwb': true,
    'image': true,
    'inset': true,
    'invert': true,
    'linear-gradient': true,
    'matrix': true,
    'matrix3d': true,
    'opacity': true,
    'perspective': true,
    'polygon': true,
    'radial-gradient': true,
    'repeating-linear-gradient': true,
    'repeating-radial-gradient': true,
    'rgb': true,
    'rgba': true,
    'rotate': true,
    'rotate3d': true,
    'rotateX': true,
    'rotateY': true,
    'rotateZ': true,
    'saturate': true,
    'sepia': true,
    'scale': true,
    'scale3d': true,
    'scaleX': true,
    'scaleY': true,
    'scaleZ': true,
    'skew': true,
    'skewX': true,
    'skewY': true,
    'symbols': true,
    'translate': true,
    'translate3d': true,
    'translateX': true,
    'translateY': true,
    'translateZ': true,
    'url': true
};

export type cssNativeFunctions = keyof typeof cssNativeFunctionsDic;
export function isCssNativeFunction(name: string): name is cssNativeFunctions {
    return cssNativeFunctionsDic[name as cssNativeFunctions];
}
