export function unescapeCSS(text: string) {
    return text.replace(/\\(.)/g, `$1`);
}
