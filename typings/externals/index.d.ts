declare module 'enhanced-resolve/lib/ResolverFactory.js' {
    const ResolverFactory: typeof import('enhanced-resolve').ResolverFactory;
    export = ResolverFactory;
}

declare module 'vlq' {
    // can be removed if https://github.com/Rich-Harris/vlq/pull/19 is merged/released
    const VLQ: typeof import('../../node_modules/vlq/types');
    export = VLQ;
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

type PostcssToken = [string, string, number, number];
interface PostcssTokenizer {
    nextToken(): PostcssToken;
    endOfFile(): boolean;
    back(token: PostcssToken): void;
}
declare module 'postcss/lib/tokenize' {
    function tokenizer(
        input: import('postcss').Input,
        options: { ignoreErrors: boolean },
    ): PostcssTokenizer;
    export = tokenizer;
}
declare module 'postcss/lib/parser' {
    import * as postcss from 'postcss';
    class Parser {
        protected input: postcss.Input;
        protected tokenizer: PostcssTokenizer;
        protected spaces: string;
        protected current: postcss.Container | postcss.Document;
        protected semicolon: boolean;
        constructor(input: postcss.Input);
        public root: postcss.Root;
        public parse(): postcss.Root;
        protected init(node: postcss.Node, offset: number): void;
        protected end(token: PostcssToken): void;
        protected comment(token: PostcssToken): void;
        protected rule(token: PostcssToken[]): void;
        protected decl(token: PostcssToken[], customProperty: boolean): void;
        protected colon(token: PostcssToken[]): number | false;
        protected unnamedAtrule(node: postcss.AtRule): void;
        protected unknownWord(token: PostcssToken[]): void;
        protected precheckMissedSemicolon(token: PostcssToken[]): void;
        protected unclosedBracket(bracket: PostcssToken): void;
        protected unexpectedClose(token: PostcssToken): void;
        protected checkMissedSemicolon(): void;
        protected endFile(): void;
        protected spacesAndCommentsFromEnd(tokens: PostcssToken[]): string;
        protected raw(
            node: postcss.Node,
            type: string,
            tokens: PostcssToken[],
            customProperty: boolean,
        ): string;
        protected getPosition(offset: number): { offset: number; line: number; column: number };
    }
    export = Parser;
}
declare module 'postcss/lib/stringifier' {
    import * as postcss from 'postcss';
    class Stringifier {
        constructor(builder: postcss.Builder);
        public stringify(node: postcss.Node): void;
        protected builder: postcss.Builder;
        protected block(node: postcss.Container, start: string): void;
    }
    export = Stringifier;
}
