export function namespace(name: string, namespace: string, delimiter = '__') {
    return namespace ? namespace + delimiter + name : name;
}
