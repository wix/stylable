declare module 'deindent' {
    function deindent(parts: string | TemplateStringsArray): string;
    export = deindent;
}

declare module 'mini-css-extract-plugin' {
    class MiniCssExtractPlugin {
        static loader: string;
        apply(compiler: typeof import('webpack').Compiler): void;
    }
    export = MiniCssExtractPlugin;
}

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

declare module 'postcss-safe-parser' {
    function postcssSafeParser(
        css: string,
        options: import('postcss').ProcessOptions
    ): import('postcss').Root;
    export = postcssSafeParser;
}

declare module 'postcss-selector-matches/dist/replaceRuleSelector' {
    // library is esm transpiled to cjs! has an actual default export.
    export default function replaceRuleSelector(
        rule: import('postcss').Rule,
        options: { lineBreak: boolean }
    ): string;
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
