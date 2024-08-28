import nodeModule from 'module';
// importing the factory directly, as we feed it our own fs, and don't want graceful-fs to be implicitly imported
import ResolverFactory from 'enhanced-resolve/lib/ResolverFactory.js';
import type { ResolveOptions } from 'enhanced-resolve';

function bundleSafeRequireExtensions(): string[] {
    let extensions: string[];
    try {
        // we use nodeModule here to avoid bundling warnings about require.extensions we always has fallback for browsers
        extensions = Object.keys(
            (nodeModule as typeof nodeModule & { _extensions?: Record<string, unknown> })
                ._extensions ?? {},
        );
    } catch {
        extensions = [];
    }
    return extensions.length ? extensions : ['.js', '.json'];
}

const resolverContext = {};
/**
 * @deprecated this resolve is slow as hell and not recommended.
 */
export function createWebpackResolver(
    fileSystem: ResolveOptions['fileSystem'],
    resolveOptions: Partial<ResolveOptions>,
) {
    const extensions =
        resolveOptions.extensions && resolveOptions.extensions.length
            ? resolveOptions.extensions
            : bundleSafeRequireExtensions();
    const eResolver = ResolverFactory.createResolver({
        ...resolveOptions,
        extensions,
        useSyncFileSystemCalls: true,
        fileSystem,
    });

    return (directoryPath: string, request: string): string => {
        const res = eResolver.resolveSync(resolverContext, directoryPath, request);
        if (res === false) {
            throw new Error(
                `Stylable does not support browser field 'false' values. ${request} resolved to 'false' from ${directoryPath}`,
            );
        }
        return res;
    };
}
