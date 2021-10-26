import type { IFileSystem, IWatchEvent, WatchEventListener } from '@file-services/types';
import { Log, levels } from '../logger';
import { createWatchEvent, DirectoryProcessService } from './directory-process-service';

interface RegisterMetaData {
    identifier: string;
}

interface Service {
    identifier: string;
    directoryProcess: DirectoryProcessService;
}

interface DirectoriesHandlerServiceOptions {
    log?: Log;
}

export class DirectoriesHandlerService {
    private services = new Set<Service>();
    private listener: WatchEventListener | undefined;
    constructor(
        private fileSystem: IFileSystem,
        private options: DirectoriesHandlerServiceOptions = {}
    ) {}

    public register(directoryProcess: DirectoryProcessService, { identifier }: RegisterMetaData) {
        this.services.add({
            identifier,
            directoryProcess,
        });
    }

    public start() {
        this.listener = async (event) => {
            this.options.log?.(levels.clear);
            this.options.log?.(
                `[${new Date().toLocaleTimeString()}]`,
                'Change detected. Starting compilation...',
                levels.info
            );

            const files = new Map<string, IWatchEvent>();
            const filesChangesSummary = {
                changed: 0,
                deleted: 0,
            };

            for (const { directoryProcess, identifier } of this.services) {
                this.options.log?.(`Aggregating affected files of "${identifier}"`);

                for (const path of directoryProcess.getAffectedFiles(event.path)) {
                    files.set(path, createWatchEvent(path, this.fileSystem));
                }
            }

            for (const { directoryProcess, identifier } of this.services) {
                this.options.log?.(`Handling watch of "${identifier}"`);
                await directoryProcess.handleWatchChange(files, event);
            }

            for (const file of files.values()) {
                if (file.stats) {
                    filesChangesSummary.changed++;
                } else {
                    filesChangesSummary.deleted++;
                }
            }

            this.options.log?.(
                `[${new Date().toLocaleTimeString()}]`,
                'Found',
                filesChangesSummary.changed,
                'changes and',
                filesChangesSummary.deleted,
                'deletions.',
                levels.info
            );
        };

        this.fileSystem.watchService.addGlobalListener(this.listener);
    }

    public stop() {
        if (this.listener) {
            this.fileSystem.watchService.removeGlobalListener(this.listener);
        } else {
            throw new Error('Directories Handler never started');
        }
    }
}
