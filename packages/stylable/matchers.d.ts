
declare module Chai {
    export interface Assertion {
        matchCSS(css: string | string[]): void;
    }
}
