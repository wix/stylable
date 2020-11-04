// importing the factory directly, as we feed it our own fs, and don't want graceful-fs to be implicitly imported
// this allows @stylable/core to be bundled for browser usage without special custom configuration
import ResolverFactory from 'enhanced-resolve/lib/ResolverFactory';

import { ModuleResolver } from './types';
import { MinimalFS } from './cached-process-file';

const resolverContext = {};

export function createDefaultResolver(fileSystem: MinimalFS, resolveOptions: any): ModuleResolver {
    const eResolver = ResolverFactory.createResolver({
        ...resolveOptions,
        useSyncFileSystemCalls: true,
        cache: false,
        fileSystem,
    });

    return (directoryPath, request) =>
        eResolver.resolveSync(resolverContext, directoryPath, request);
}
