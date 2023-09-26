// in browser build this gets remapped to an empty object via our package.json->"browser"

import { IRequestResolverOptions, createRequestResolver } from '@file-services/resolve';
import type { ModuleResolver } from './types';

export function createDefaultResolver(options: IRequestResolverOptions): ModuleResolver {
    const resolver = createRequestResolver({
        extensions: ['.js', '.json', '.mjs', '.cjs', '.ts', '.mts', '.cts'],
        ...options,
    });

    return (directoryPath, request): string => {
        const res = resolver(directoryPath, request);
        if (res.resolvedFile === false) {
            throw new Error(
                `Stylable does not support browser field 'false' values. ${request} resolved to 'false' from ${directoryPath}`
            );
        }
        if (typeof res.resolvedFile !== 'string') {
            throw new Error(`Stylable could not resolve ${JSON.stringify(request)} from ${JSON.stringify(directoryPath)}`);
        }
        return res.resolvedFile;
    };
}
