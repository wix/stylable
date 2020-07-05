// export function scope(name: string, namespace: string, separator: string = '-') {
//     return namespace ? namespace + separator + name : name;
// }

export function stripQuotation(str: string) {
    return str.replace(/^['"](.*?)['"]$/g, '$1');
}

export function filename2varname(filename: string) {
    return string2varname(filename.replace(/(?=.*)\.\w+$/, '').replace(/\.st$/, ''));
}

export function string2varname(str: string) {
    return str.replace(/[^0-9a-zA-Z_]/gm, '').replace(/^[^a-zA-Z_]+/gm, '');
}

const deprecatedCache: { [message: string]: boolean } = {};

export function deprecated(staticMessage: string) {
    if (!deprecatedCache[staticMessage]) {
        deprecatedCache[staticMessage] = true;
        try {
            console.warn('DEPRECATED: ' + staticMessage);
        } catch {
            /**/
        }
    }
}
