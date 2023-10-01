import type { Imported, JSResolve, StylableMeta } from '@stylable/core';
import type { CSSResolveMaybe } from '@stylable/core/dist/index-internal';

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
    resolved: CSSResolveMaybe | JSResolve | null;
};
