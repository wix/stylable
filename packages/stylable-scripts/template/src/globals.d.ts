type RuntimeStylesheet = import('@stylable/runtime').RuntimeStylesheet;

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