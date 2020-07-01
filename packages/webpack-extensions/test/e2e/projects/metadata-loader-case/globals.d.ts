declare module 'stylable-metadata?exposeNamespaceMapping=true!*.st.css' {
    const stylesheetMetadata: {
        entry: string;
        stylesheetMapping: Record<string, string>;
        namespaceMapping: Record<string, string>;
    };
    export = stylesheetMetadata;
}

declare module 'stylable-metadata!*.st.css' {
    const stylesheetMetadata: {
        entry: string;
        stylesheetMapping: Record<string, string>;
        namespaceMapping?: Record<string, string>;
    };
    export = stylesheetMetadata;
}
