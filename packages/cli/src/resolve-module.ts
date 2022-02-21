import type { IFileSystem } from '@file-services/types';
import { createRequestResolver } from '@file-services/resolve';
import type { StylableConfig } from '@stylable/core';

export function createDefaultResolveModule(fs: IFileSystem): StylableConfig['resolveModule'] {
    const moduleResolver = createRequestResolver({ fs });

    return (context, request) => {
        const { resolvedFile } = moduleResolver(context, request);

        if (resolvedFile === false) {
            throw new Error(
                `Stylable CLI does not support browser field 'false' values. "${request}" resolved to 'false' from "${context}"`
            );
        } else if (resolvedFile === undefined) {
            throw new Error(`Stylable CLI cannot resolve request: "${request}"`);
        }

        return resolvedFile;
    };
}
