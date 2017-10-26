interface StateMap {
    [key: string]: boolean
}

interface Stylesheet {
    namespace: string;
    root: string;
    get: (localName: string) => string;
    cssStates: (stateMapping: StateMap) => StateMap;
}

type RuntimeStylesheet = {[key: string]: string} & {$stylesheet: Stylesheet};

declare module '*.svg' {
    const urlToFile: string;
    export default urlToFile;
}
declare module '*.st.css' {
    const stylesheet: RuntimeStylesheet;
    export default stylesheet;
}

declare module '*.css' {
    const stylesheet: void;
    export default stylesheet;
}
