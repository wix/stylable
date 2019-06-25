import { cachedProcessFile, FileProcessor, MinimalFS } from './cached-process-file';
import { safeParse } from './parser';
import { process, processNamespace, StylableMeta } from './stylable-processor';
const ResolverFactory = require('enhanced-resolve/lib/ResolverFactory');

export interface StylableInfrastructure {
    fileProcessor: FileProcessor<StylableMeta>;
    resolveFrom: (context: string | undefined, path: string) => string;
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
        return eResolver.resolveSync({}, directoryPath, moduleId);;
    };

    const fileProcessor = cachedProcessFile<StylableMeta>(
        (from, content) => {
            const parsedAST = safeParse(content, { from });
            return process(parsedAST, undefined, resolveNamespace);
        },
        fileSystem,
        resolveFrom
    );

    if (onProcess) {
        fileProcessor.postProcessors.push(onProcess);
    }

    return {
        resolveFrom,
        fileProcessor
    };
}
