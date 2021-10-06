export function removeUndefined<T extends object>(obj: T) {
    return Object.fromEntries(
        Object.entries(obj).filter(([, value]) => typeof value !== 'undefined')
    ) as Required<Exclude<T, undefined>>;
}

export function asteriskMatch(source: string, target: string) {
    return new RegExp(source.replace(new RegExp('\\*', 'g'), '(.*?)')).test(target);
}
