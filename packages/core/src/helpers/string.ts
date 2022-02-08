export function stripQuotation(str: string) {
    return str.replace(/^['"](.*?)['"]$/g, '$1');
}

export function filename2varname(filename: string) {
    return string2varname(filename.replace(/(?=.*)\.\w+$/, '').replace(/\.st$/, ''));
}

function string2varname(str: string) {
    return str.replace(/[^0-9a-zA-Z_]/gm, '').replace(/^[^a-zA-Z_]+/gm, '');
}
