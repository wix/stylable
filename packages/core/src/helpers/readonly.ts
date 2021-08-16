export type DeepReadonlyObject<T> = {
    readonly [P in keyof T]: DeepReadonlyObject<T[P]>;
};
