export interface Metadata {
    entry: string;
    stylesheetMapping: Record<string, string>;
    namespaceMapping?: Record<string, string>;
}

export interface Manifest {
    name: string;
    version: string;
    stylesheetMapping: Record<string, string>;
    namespaceMapping: Record<string, string>;
    componentsEntries: Record<string, string>;
    componentsIndex: string;
}
