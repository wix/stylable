import path from 'path';
import { cachedProcessFile, FileProcessor, MinimalFS } from './cached-process-file';
import { CssParser, safeParse } from './parser';
import { process, processNamespace, StylableMeta } from './stylable-processor';
import { timedCache, TimedCacheOptions } from './timed-cache';
import { createDefaultResolver } from './module-resolver';
import type { Diagnostics } from './diagnostics';

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
    timedCacheOptions?: Omit<TimedCacheOptions, 'createKey'>,
    resolveModule = createDefaultResolver(fileSystem, resolveOptions),
    cssParser: CssParser = safeParse,
    createDiagnostics?: (from: string) => Diagnostics
): StylableInfrastructure {
    let resolvePath = (context: string | undefined = projectRoot, moduleId: string) => {
        return path.isAbsolute(moduleId) ? moduleId : resolveModule(context, moduleId);
    };

    if (timedCacheOptions) {
        const cacheManager = timedCache(resolvePath, {
            createKey: (args: string[]) => args.join(';'),
            ...timedCacheOptions,
        });
        resolvePath = cacheManager.get;
    }

    const fileProcessor = cachedProcessFile<StylableMeta>(
        (from, content) => {
            const resolvedFrom = resolvePath(projectRoot, from);
            return process(
                cssParser(content, { from: resolvedFrom }),
                createDiagnostics?.(resolvedFrom),
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
                        mtime: new Date(0),
                    };
                }
                return stat;
            },
            readlinkSync() {
                throw new Error(`not implemented`);
            },
        },
        (path, context) => resolvePath(context || projectRoot, path)
    );

    if (onProcess) {
        fileProcessor.postProcessors.push(onProcess);
    }

    return {
        resolvePath,
        fileProcessor,
    };
}
