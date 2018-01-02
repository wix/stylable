import {Pojo} from './types';

export const matchValue = /value\((.*?)\)/g;

// TODO: move this functionality (hook while resolving a var) to the functions mechanism
export function valueReplacer(
    value: string,
    data: Pojo,
    onMatch: (value: string, name: string, match: string) => any,
    debug: boolean = false
): string {
    const result = replaceValue(value, data, onMatch, debug, []);
    return result + ((debug && result !== value) ? ` /* ${value} */` : '');
}

function replaceValue(
    value: string,
    data: Pojo,
    onMatch: (value: string, name: string, match: string) => any,
    debug: boolean,
    visited: string[]
): string {
    const result = value.replace(matchValue, (match: string, name: string) => {
        const visitedIndex = visited.indexOf(name);
        if (visitedIndex !== -1) {
            return 'cyclic-value' + (debug ? `(${visited.slice(visitedIndex).join('>') + '>' + name})` : '');
        }
        let translatedValue = onMatch(data[name], name, match) || match;
        translatedValue = replaceValue(translatedValue, data, onMatch, debug, visited.concat(name));
        return translatedValue;
    });
    return result;
}
