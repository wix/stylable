export type StateValue = boolean | number | string;

export interface StateMap {
    [stateName: string]: StateValue;
}

export interface AttributeMap {
    className?: string;
    [attributeName: string]: StateValue | undefined;
}

export interface InheritedAttributes {
    className?: string;
    [props: string]: any;
}

export interface StylableExports {
    classes: Record<string, string>;
    keyframes: Record<string, string>;
    vars: Record<string, string>;
    stVars: Record<string, string>;
}

export interface RuntimeStylesheet extends StylableExports, RenderableStylesheet {
    namespace: string;
    cssStates: (stateMap: StateMap) => string;
    style: (context: string, stateOrClass: string | StateMap, ...classes: string[]) => string;
}

export interface NodeRenderer<I, O extends Element> {
    update(stylesheet: I, node: O): O;
    create(stylesheet: I, key: string | number): O;
    renderKey(stylesheet: I): string | number;
    hasKey(node: O): boolean;
}

export interface RenderableStylesheet {
    $depth: number;
    $id: string | number;
    $css?: string;
}
