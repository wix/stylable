/// <reference path="../node_modules/stylable/runtime.d.ts" />

declare module '*.svg' {
    const urlToFile: string;
    export default urlToFile;
}
declare module '*.st.css' {
    const stylesheet: Stylable.RuntimeStylesheet;
    export default stylesheet;
}

declare module '*.css' {
    const stylesheet: void;
    export default stylesheet;
}
