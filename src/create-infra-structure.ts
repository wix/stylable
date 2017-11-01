import * as path from 'path';
import {cachedProcessFile, FileProcessor, MinimalFS} from './cached-process-file';
import {safeParse} from './parser';
import {process, StylableMeta} from './stylable-processor';
const ResolverFactory = require('enhanced-resolve/lib/ResolverFactory');

export interface StylableInfrastructure {
    fileProcessor: FileProcessor<StylableMeta>;
    resolvePath: (context: string, path: string) => string;
}

export function createInfrastructure(
    projectRoot: string,
    fileSystem: MinimalFS,
    onProcess: (meta: StylableMeta, path: string) => StylableMeta = x => x
): StylableInfrastructure {
    const eResolver = ResolverFactory.createResolver({
        useSyncFileSystemCalls: true,
        fileSystem
    });

    const fileProcessor = cachedProcessFile<StylableMeta>((from, content) => {
        if (!path.isAbsolute(from)) {
            from = eResolver.resolveSync({}, projectRoot, from);
        }
        return onProcess(process(safeParse(content, {from})), from);
    }, {
            readFileSync(moduleId: string) {
                if (!path.isAbsolute(moduleId)) {
                    moduleId = eResolver.resolveSync({}, projectRoot, moduleId);
                }
                return fileSystem.readFileSync(moduleId, 'utf8');
            },
            statSync(moduleId: string) {
                if (!path.isAbsolute(moduleId)) {
                    moduleId = eResolver.resolveSync({}, projectRoot, moduleId);
                }
                const stat = fileSystem.statSync(moduleId);
                if (!stat.mtime) {
                    return {
                        mtime: new Date(0)
                    };
                }

                return stat;
            }
        });

    return {
        resolvePath(context: string, moduleId: string) {
            if (!path.isAbsolute(moduleId) && moduleId.charAt(0) !== '.') {
                moduleId = eResolver.resolveSync({}, context, moduleId);
            }
            return moduleId;
        },
        fileProcessor
    };
}
