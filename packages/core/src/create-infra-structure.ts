// import { isAbsolute } from 'path';
import { cachedProcessFile, FileProcessor, MinimalFS } from './cached-process-file';
import { safeParse } from './parser';
import { process, processNamespace, StylableMeta } from './stylable-processor';
const ResolverFactory = require('enhanced-resolve/lib/ResolverFactory');

export interface StylableInfrastructure {
    fileProcessor: FileProcessor<StylableMeta>;
    resolvePath: (context: string | undefined, path: string) => string;
}

export function createInfrastructure(
    projectRoot: string,
    fileSystem: MinimalFS,
    onProcess?: (meta: StylableMeta, path: string) => StylableMeta,
    resolveOptions: any = {},
    resolveNamespace?: typeof processNamespace
): StylableInfrastructure {
    const eResolver = ResolverFactory.createResolver({
        useSyncFileSystemCalls: true,
        fileSystem,
        ...resolveOptions
    });

    const resolveFrom = (directoryPath: string | undefined = projectRoot, moduleId: string) => {
        const resolveId = eResolver.resolveSync({}, directoryPath, moduleId);
        // console.log('resolvePath', directoryPath, moduleId, resolveId);
        return resolveId;
    };

    const fileProcessor = cachedProcessFile<StylableMeta>(
        (from, content) => {
            const parsedAST = safeParse(content, { from });
            return process(parsedAST, undefined, resolveNamespace);
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
        (path, context) => resolveFrom(context || projectRoot, path)
    );

    if (onProcess) {
        fileProcessor.postProcessors.push(onProcess);
    }

    return {
        resolvePath: resolveFrom,
        fileProcessor
    };
}
