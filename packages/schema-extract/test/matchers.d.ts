declare module Chai {
    export interface Assertion {
        flatMatch(obj: any, maxDepth?: number): void;
    }
}
