export function removeUndefined<T extends object>(obj: T) {
    return Object.fromEntries(
        Object.entries(obj).filter(([, value]) => typeof value !== 'undefined')
    ) as Required<Exclude<T, undefined>>;
}
