import { globalValueRegExp } from './stylable-value-parsers';

export function globalValue(str: string) {
    const match = str.match(globalValueRegExp);

    return match?.[1];
}

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
