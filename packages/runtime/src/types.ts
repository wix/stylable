export type StateValue = boolean | number | string | undefined;

export interface ClassesMap {
    root: string;
    [className: string]: string;
}

export interface StateMap {
    [stateName: string]: StateValue;
}

export interface AttributeMap {
    className?: string;
    [attributeName: string]: StateValue;
}

export interface InheritedAttributes {
    className?: string;
    [props: string]: any;
}

export type RuntimeStVar = string | { [key: string]: RuntimeStVar } | RuntimeStVar[];

export interface StylableExports {
    classes: ClassesMap;
    keyframes: Record<string, string>;
    layers: Record<string, string>;
    containers: Record<string, string>;
    stVars: Record<string, RuntimeStVar>;
    vars: Record<string, string>;
}

export type STFunction = (
    context: string | undefined,
    stateOrClass?: string | StateMap | undefined,
    ...classes: Array<string | undefined>
) => string;

export interface RuntimeStylesheet extends StylableExports, RenderableStylesheet {
    namespace: string;
    cssStates: (stateMap: StateMap) => string;
    style: STFunction;
    st: STFunction;
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

export interface Host {
    sts?: (
        namespace: string,
        context: string | undefined,
        stateOrClass?: string | StateMap | undefined,
        ...classes: Array<string | undefined>
    ) => string;
    stc?: (namespace: string, stateMapping?: StateMap | null | undefined) => string;
    sti?: (namespace: string, css: string, depth: number, runtimeId: string) => void;
}
