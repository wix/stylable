declare namespace Chai {
    export interface Assertion {
        flatMatch(obj: any, maxDepth?: number): void;
    }
}
