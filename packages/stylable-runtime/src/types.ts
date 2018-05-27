export type StateValue = boolean | number | string;

export interface StateMap {
    [stateName: string]: StateValue;
}

export interface AttributeMap {
    className: string
    [attributeName: string]: string
}

export interface RuntimeStylesheet {
    (): AttributeMap
    $root: string,
    $namespace: string,
    $depth: number,
    $id: string | number,
    $css?: string,

    $get(localName: string): string;
    $cssStates(stateMapping?: StateMap | null): StateMap;
}

export interface NodeRenderer<I, O extends Element> {
    update(stylesheet: I, node: O): O
    create(stylesheet: I, key: string | number): O
    renderKey(stylesheet: I): string | number
    hasKey(node: O): boolean
}
