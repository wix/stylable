import {
    IRequestResolverOptions,
    IResolutionFileSystem,
    createRequestResolver,
} from '@file-services/resolve';
import type { ModuleResolver } from './types.js';

export type { IRequestResolverOptions, IResolutionFileSystem };

export function createDefaultResolver(options: IRequestResolverOptions): ModuleResolver {
    const resolver = createRequestResolver({
        extensions: ['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts', '.json'],
        ...options,
    });

    return (directoryPath, request): string => {
        const { resolvedFile, visitedPaths } = resolver(directoryPath, request);

        if (resolvedFile === false) {
            throw new Error(
                `Stylable does not support browser field 'false' values. ${request} resolved to 'false' from ${directoryPath}`,
            );
        }
        if (typeof resolvedFile !== 'string') {
            throw new Error(
                `Stylable could not resolve ${JSON.stringify(request)} from ${JSON.stringify(
                    directoryPath,
                )}` +
                    (visitedPaths.size ? `\nVisited paths:\n${[...visitedPaths].join('\n')}` : ''),
            );
        }
        return resolvedFile;
    };
}
