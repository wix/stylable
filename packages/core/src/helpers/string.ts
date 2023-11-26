export function stripQuotation(str: string) {
    return str.replace(/^['"](.*?)['"]$/g, '$1');
}

export function filename2varname(filename: string) {
    return string2varname(
        filename
            // remove extension (eg. .css)
            .replace(/(?=.*)\.\w+$/, '')
            // remove potential .st extension prefix
            .replace(/\.st$/, '')
    );
}

function string2varname(str: string) {
    return (
        str
            // allow only letters, numbers and underscores
            .replace(/[^0-9a-zA-Z_]/gm, '')
            // replace multiple underscores with single underscore
            .replace(/__+/gm, '_')
            // remove leading if not letters or underscores
            .replace(/^[^a-zA-Z_]+/gm, '')
    );
}
