interface Classes {
    readonly root: 'ns-root';
}

interface States {
    root: {
        loading?: boolean;
    };
    text: {
        spaced?: string;
    };
}

export const namespace: '';
export const $depth: -1;
export const $id: '';
export const $css: string;

// export declare const classes: typeof stylesheet.classes;
export declare const keyframes: {
    readonly root: 'ns-root';
};
export declare const vars: {
    readonly root: 'ns-root';
};
export declare const stVars: {
    readonly root: 'ns-root';
};
export declare function cssStates(stateMap: States): string;
export declare function style<T extends keyof Classes>(
    context: T,
    stateOrClass?: string | States | undefined,
    ...classes: Array<keyof Classes | string | undefined>
): string;

type GetStates<T extends string> = T extends keyof States ? States[T] : never;
type AllStates = { [K in keyof States]: K[0] };
type S = GetStates<'root'>;


export declare function style2<T extends keyof Classes>(
    context: T,
    stateOrClass?: string | GetStates<T> | undefined,
    ...classes: Array<keyof Classes | string | undefined>
): string;


style2('roots', {});