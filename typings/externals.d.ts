declare module 'deindent' {
    function deindent(parts: string | TemplateStringsArray): string;
    export = deindent;
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
    function replaceRuleSelector(
        rule: import('postcss').Rule,
        options: { lineBreak: boolean }
    ): string;
    export = replaceRuleSelector;
}

declare module 'node-eval' {
    function nodeEval(
        source: string,
        filename: string,
        options?: { require?(id: string): any }
    ): any;
    export = nodeEval;
}
