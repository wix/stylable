declare namespace Chai {
    export interface Assertion {
        matchCSS(css: string | string[]): void;
        flatMatch(obj: any, maxDepth?: number): void;
        styleRules(expectedRules: string[] | { [key: number]: string }): void;
        mediaQuery(index: number): Chai.Assertion;
    }
}
