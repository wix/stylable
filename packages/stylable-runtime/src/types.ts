export type StateValue = boolean | number | string;

export interface StateMap {
    [stateName: string]: StateValue;
}

export interface AttributeMap {
    className?: string
    [attributeName: string]: StateValue | undefined | null
}

export type RuntimeStylesheet = {
    (className: string, states: StateMap, inheritedAttributes: AttributeMap): AttributeMap
    $root: string,
    $namespace: string,
    $depth: number,
    $id: string | number,
    $css?: string,

    $get(localName: string): string | undefined;
    $cssStates(stateMapping?: StateMap | null): StateMap;
} & { [localName: string]: string }

export interface NodeRenderer<I, O extends Element> {
    update(stylesheet: I, node: O): O
    create(stylesheet: I, key: string | number): O
    renderKey(stylesheet: I): string | number
    hasKey(node: O): boolean
}

export interface RenderableStylesheet {
    $depth: number,
    $id: string | number,
    $css?: string,
}