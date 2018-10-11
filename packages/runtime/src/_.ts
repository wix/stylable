export type StateValue = boolean | number | string;

export interface StateMap {
    [name: string]: string;
}

export interface AttributeMap {
    className?: string;
    [attributeName: string]: StateValue | undefined;
}

export interface InheritedAttributes {
    className?: string;
    [prop: string]: any;
}

export type RuntimeStylesheet<Locals = { [localName: string]: string }, States = StateMap> = {
    (
        className: string,
        states?: Partial<States> | null,
        inheritedAttributes?: InheritedAttributes
    ): AttributeMap;
    $root: string;
    $namespace: string;
    $depth: number;
    $id: string | number;
    $css?: string;
    $get(localName: keyof Locals): string | undefined;
    $cssStates(stateMapping?: Partial<States> | null): StateMap;
} & Locals;

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
