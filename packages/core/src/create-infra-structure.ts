import path from 'path';
import { cachedProcessFile, FileProcessor, MinimalFS } from './cached-process-file';
import { safeParse } from './parser';
import { process, processNamespace, StylableMeta } from './stylable-processor';
import { timedCache, TimedCacheOptions } from './timed-cache';

// importing the factory directly, as we feed it our own fs, and don't want graceful-fs to be implicitly imported
// this allows @stylable/core to be bundled for browser usage without special custom configuration
const ResolverFactory = require('enhanced-resolve/lib/ResolverFactory') as typeof import('enhanced-resolve').ResolverFactory;

export interface StylableInfrastructure {
    fileProcessor: FileProcessor<StylableMeta>;
    resolvePath: (context: string | undefined, path: string) => string;
}

export function createInfrastructure(
    projectRoot: string,
    fileSystem: MinimalFS,
    onProcess?: (meta: StylableMeta, path: string) => StylableMeta,
    resolveOptions: any = {},
    resolveNamespace?: typeof processNamespace,
    timedCacheOptions?: Omit<TimedCacheOptions, 'createKey'>
): StylableInfrastructure {
    const eResolver = ResolverFactory.createResolver({
        useSyncFileSystemCalls: true,
        fileSystem,
        ...resolveOptions
    });

    let resolvePath = (context: string | undefined = projectRoot, moduleId: string) => {
        if (!path.isAbsolute(moduleId) && !moduleId.startsWith('.')) {
            moduleId = eResolver.resolveSync({}, context, moduleId);
        }
        return moduleId;
    };

    if (timedCacheOptions) {
        const cacheManager = timedCache(resolvePath, {
            timeout: 1,
            useTimer: true,
            createKey: (args: string[]) => args.join(';'),
            ...timedCacheOptions
        });
        resolvePath = cacheManager.get;
    }

    const fileProcessor = cachedProcessFile<StylableMeta>(
        (from, content) => {
            return process(
                safeParse(content, { from: resolvePath(projectRoot, from) }),
                undefined,
                resolveNamespace
            );
        },
        {
            readFileSync(resolvedPath: string) {
                return fileSystem.readFileSync(resolvedPath, 'utf8');
            },
            statSync(resolvedPath: string) {
                const stat = fileSystem.statSync(resolvedPath);
                if (!stat.mtime) {
                    return {
                        mtime: new Date(0)
                    };
                }
                return stat;
            }
        },
        (path, context) => resolvePath(context || projectRoot, path)
    );

    if (onProcess) {
        fileProcessor.postProcessors.push(onProcess);
    }

    return {
        resolvePath,
        fileProcessor
    };
}
