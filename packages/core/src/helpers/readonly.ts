export type DeepReadonlyObject<T> = {
    readonly [P in keyof T]: DeepReadonlyObject<T[P]>;
};

export type DeepReadOnlyAll<T> = T extends (...args: any[]) => any
    ? (...args: DeepReadOnlyAll<Parameters<T>>) => DeepReadOnlyAll<ReturnType<T>>
    : T extends Record<any, any>
    ? { readonly [P in keyof T]: DeepReadOnlyAll<T[P]> }
    : T extends Array<any>
    ? ReadonlyArray<T>
    : Readonly<T>;
