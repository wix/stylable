export const namespaceDelimiter = '__';
export function namespace(name: string, namespace: string) {
    return namespace ? namespace + namespaceDelimiter + name : name;
}
