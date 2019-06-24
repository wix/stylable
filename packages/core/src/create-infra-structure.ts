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
            readFileSync(filePath: string) {
                return fileSystem.readFileSync(filePath, 'utf8');
            },
            statSync(filePath: string) {
                const stat = fileSystem.statSync(filePath);
                if (!stat.mtime) {
                    // for memory-fs of webpack which is missing the fields sometimes
                    return {
                        mtime: new Date(0)
                    };
                }
                return stat;
            }
        },
        resolveFrom
    );

    if (onProcess) {
        fileProcessor.postProcessors.push(onProcess);
    }

    return {
        resolvePath: resolveFrom,
        fileProcessor
    };
}
