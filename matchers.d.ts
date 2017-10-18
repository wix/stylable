declare module Chai {
    export interface Assertion {
        matchCSS(css: string | string[]): void;
        flatMatch(obj: any, maxDepth?: number): void;
    }
}
