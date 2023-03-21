// importing the factory directly, as we feed it our own fs, and don't want graceful-fs to be implicitly imported
// this allows @stylable/core to be bundled for browser usage without special custom configuration
import ResolverFactory from 'enhanced-resolve/lib/ResolverFactory.js';

import type { ModuleResolver } from './types';
import type { MinimalFS } from './cached-process-file';

function bundleSafeRequireExtensions(): string[] {
    let extensions: string[];
    try {
        // we use eval here to avoid bundling warnings about require.extensions we always has fallback for browsers
        extensions = Object.keys(require('module')._extensions);
    } catch (e) {
        extensions = [];
    }
    return extensions.length ? extensions : ['.js', '.json'];
}

const resolverContext = {};

export function createDefaultResolver(fileSystem: MinimalFS, resolveOptions: any): ModuleResolver {
    const extensions =
        resolveOptions.extensions && resolveOptions.extensions.length
            ? resolveOptions.extensions
            : bundleSafeRequireExtensions();
    const eResolver = ResolverFactory.createResolver({
        ...resolveOptions,
        extensions,
        useSyncFileSystemCalls: true,
        cache: false,
        fileSystem,
    });

    return (directoryPath, request): string => {
        const res = eResolver.resolveSync(resolverContext, directoryPath, request);
        if (res === false) {
            throw new Error(
                `Stylable does not support browser field 'false' values. ${request} resolved to 'false' from ${directoryPath}`
            );
        }
        return res;
    };
}
