import { dirname } from 'path';
import {
    sys,
    ModuleResolutionKind,
    nodeModuleNameResolver,
    ResolvedModuleFull,
    createModuleResolutionCache,
    normalizeSlashes,
} from 'typescript';

export function createResolver(currentDirectory: string, resolveExternalLibrary = true) {
    const resCache = createModuleResolutionCache(currentDirectory, (id) => id);
    return function resolveRequest(request: string, issuer: string) {
        return adjustResolvedFilePath(
            request,
            issuer,
            resolveExternalLibrary,
            nodeModuleNameResolver(
                request,
                issuer,
                { moduleResolution: ModuleResolutionKind.NodeJs },
                sys,
                resCache
            ).resolvedModule
        );
    };
}

function adjustResolvedFilePath(
    request: string,
    issuer: string,
    resolveExternalLibrary: boolean,
    resolved: ResolvedModuleFull | undefined
) {
    if (!resolved) {
        return resolved;
    }
    if (resolved.isExternalLibraryImport && resolved.packageId && resolved.extension === '.d.ts') {
        if (!resolveExternalLibrary) {
            return undefined;
        }
        try {
            return normalizeSlashes(
                require.resolve(request, {
                    paths: [dirname(issuer)],
                })
            );
        } catch (e) {
            console.warn(e, { issuer, request });
        }
    }
    return resolved.resolvedFileName;
}
