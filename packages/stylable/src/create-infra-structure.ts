import { cachedProcessFile, FileProcessor, MinimalFS } from './cached-process-file';
import { safeParse } from './parser';
import * as path from './path';
import { process, StylableMeta } from './stylable-processor';
const ResolverFactory = require('enhanced-resolve/lib/ResolverFactory');

export interface StylableInfrastructure {
    fileProcessor: FileProcessor<StylableMeta>;
    resolvePath: (context: string | undefined, path: string) => string;
}

export function createInfrastructure(
    projectRoot: string,
    fileSystem: MinimalFS,
    onProcess?: (meta: StylableMeta, path: string) => StylableMeta,
    resolveOptions: any = {}
): StylableInfrastructure {
    const eResolver = ResolverFactory.createResolver({
        useSyncFileSystemCalls: true,
        fileSystem,
        ...resolveOptions
    });

    const resolvePath = (context: string | undefined = projectRoot, moduleId: string) => {
        if (!path.isAbsolute(moduleId) && moduleId.charAt(0) !== '.') {
            moduleId = eResolver.resolveSync({}, context, moduleId);
        }
        return moduleId;
    };

    const fileProcessor = cachedProcessFile<StylableMeta>(
        (from, content) => {
            return process(safeParse(content, { from: resolvePath(projectRoot, from) }));
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
        path => resolvePath(projectRoot, path)
    );

    if (onProcess) {
        fileProcessor.postProcessors.push(onProcess);
    }

    return {
        resolvePath,
        fileProcessor
    };
}
