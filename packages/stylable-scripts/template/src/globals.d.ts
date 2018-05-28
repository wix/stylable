type StateValue = boolean | number | string;

interface StateMap {
    [stateName: string]: StateValue;
}

interface AttributeMap {
    className?: string
    [attributeName: string]: StateValue | undefined
}

interface InheritedAttributes {
    className?: string
    [props: string]: any
}

type RuntimeStylesheet = {
    (className: string, states: StateMap, inheritedAttributes: InheritedAttributes): AttributeMap
    $root: string,
    $namespace: string,
    $depth: number,
    $id: string | number,
    $css?: string,

    $get(localName: string): string | undefined;
    $cssStates(stateMapping?: StateMap | null): StateMap;
} & { [localName: string]: string }

declare module '*.st.css' {
    const stylesheet: RuntimeStylesheet;
    export default stylesheet;
}

declare module '*.svg' {
    const urlToFile: string;
    export default urlToFile;
}

declare module '*.css' {
    const stylesheet: void;
    export default stylesheet;
}