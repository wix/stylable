/* eslint-disable no-control-regex */
export function stripQuotation(str: string) {
    return str.replace(/^['"](.*?)['"]$/g, '$1');
}

export function filename2varname(filename: string) {
    return string2varname(
        filename
            // remove extension (eg. .css)
            .replace(/(?=.*)\.\w+$/, '')
            // remove potential .st extension prefix
            .replace(/\.st$/, ''),
    );
}

export function string2varname(str: string) {
    return (
        str
            // allow only letters, numbers, dashes, underscores, and non-ascii
            .replace(/[\x00-\x7F]+/gm, (matchAscii) => {
                return matchAscii.replace(/[^0-9a-zA-Z_-]/gm, '');
            })
            // replace multiple dashes with single dash
            .replace(/--+/gm, '-')
            // replace multiple underscores with single underscore
            .replace(/__+/gm, '_')
            // remove leading digits from start
            .replace(/^\d+/gm, '')
    );
}
