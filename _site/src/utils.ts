export function hasKeys(o: {}) {
    for (const k in o) {
        if (o.hasOwnProperty(k)) {
            return true;
        }
    }
    return false;
}

export const hasOwn = Function.prototype.call.bind(Object.prototype.hasOwnProperty);

// export function scope(name: string, namespace: string, separator: string = '-') {
//     return namespace ? namespace + separator + name : name;
// }

export function stripQuotation(str: string) {
    return str.replace(/^['"]|['"]$/g, '');
}

export function filename2varname(filename: string) {
    return string2varname(filename.replace(/(?=.*)\.\w+$/, '').replace(/\.st$/, ''));
}

export function string2varname(str: string) {
    return str
        .replace(/[^0-9a-zA-Z_]/gm, '')
        .replace(/^[^a-zA-Z_]+/gm, '');
}
