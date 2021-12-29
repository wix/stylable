import cssesc from 'cssesc';

export function unescapeCSS(text: string) {
    return text.replace(/\\(.)/g, `$1`);
}

export function namespaceEscape(name: string, namespace: string) {
    return namespace ? cssesc(namespace, { isIdentifier: true }) + `__` + name : name;
}

export function escapeIdentifier(value: string) {
    return cssesc(value, { isIdentifier: true });
}
