export const GLOBAL_FUNC = 'st-global' as const;

const globalValueRegExp = new RegExp(`^${GLOBAL_FUNC}\\((.*?)\\)$`);

export function globalValue(str: string) {
    const match = str.match(globalValueRegExp);
    return match?.[1];
}
