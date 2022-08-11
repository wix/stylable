export type StateValue = boolean | number | string | undefined;

export interface ClassesMap {
    root: string;
    [className: string]: string;
}

export type StateMap = Record<string, StateValue>;

export type RuntimeStVar = string | { [key: string]: RuntimeStVar } | RuntimeStVar[];

export interface StylableExports {
    classes: ClassesMap;
    keyframes: Record<string, string>;
    layers: Record<string, string>;
    stVars: Record<string, RuntimeStVar>;
    vars: Record<string, string>;
}

export type STFunction = (
    context: string | undefined,
    stateOrClass?: string | StateMap | undefined,
    ...classes: Array<string | undefined>
) => string;

export interface RuntimeStylesheet extends StylableExports {
    namespace: string;
    cssStates: (stateMap: StateMap) => string;
    style: STFunction;
    st: STFunction;
}
