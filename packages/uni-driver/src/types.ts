export type StateValue = boolean | number | string;

export interface ElementRemoteApi {
    hasClass(s: string): Promise<boolean>;
    attr(name: string): Promise<string | null>;
}

export interface MinimalStylesheet {
    cssStates(states: Record<string, StateValue>): string;
}
