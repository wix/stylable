import type { CSSResolve, Imported, JSResolve, StylableMeta } from '@stylable/core';

export interface Metadata {
    entry: string;
    usedMeta: Map<StylableMeta, ResolvedImport[]>;
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

export type MetadataList = Array<{
    meta: StylableMeta;
    compId: string;
    metadata: Metadata;
}>;

export type ResolvedImport = {
    stImport: Imported;
    resolved: CSSResolve | JSResolve | null;
};
