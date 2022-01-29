declare module 'enhanced-resolve/lib/ResolverFactory' {
    const ResolverFactory: typeof import('enhanced-resolve').ResolverFactory;
    export = ResolverFactory;
}

declare module 'is-vendor-prefixed' {
    function isVendorPrefixed(value: string): boolean;
    export = isVendorPrefixed;
}

declare module 'postcss-js' {
    const postcssJs: import('postcss').Parser;
    export = postcssJs;
}

declare module 'node-eval' {
    function nodeEval(content: string, filename: string, context?: object): any;
    export = nodeEval;
}

// declare module '!!stylable-metadata?exposeNamespaceMapping=true!*.st.css' {
//     const stylesheetMetadata: {
//         entry: string;
//         stylesheetMapping: Record<string, string>;
//         namespaceMapping: Record<string, string>;
//     };
//     export = stylesheetMetadata;
// }

// declare module '!!stylable-metadata!*.st.css' {
//     const stylesheetMetadata: {
//         entry: string;
//         stylesheetMapping: Record<string, string>;
//         namespaceMapping?: Record<string, string>;
//     };
//     export = stylesheetMetadata;
// }
