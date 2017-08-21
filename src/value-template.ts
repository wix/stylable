import { Pojo } from "./types";

export const matchValue = /value\((.*?)\)/g

export function valueReplacer(value: string, data: Pojo, onMatch: (value: string, name: string, match: string) => any, debug: boolean = false): string {
    return value.replace(matchValue, function (match: string, name: string) {
        const translatedValue = onMatch(data[name], name, match);
        return translatedValue !== undefined ? translatedValue + (debug ? `/*${name}*/` : '') : match;
    });
}
